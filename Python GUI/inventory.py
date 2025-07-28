import sys
import sqlite3
import hashlib
from datetime import datetime, timedelta
import pandas as pd
from PyQt5.QtWidgets import *
from PyQt5.QtCore import *
from PyQt5.QtGui import *
try:
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
except ImportError:
    from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch, mm
import json
import os

# Database Manager
class DatabaseManager:
    def __init__(self, db_name="inventory.db"):
        self.db_name = db_name
        self.init_database()

    def init_database(self):
        """Initialize database with required tables and migrate if needed"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()

        # Users table (roles: admin, manager, staff)
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT)''')

        # Migrate users table: add email and last_login columns if missing
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'email' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
        if 'last_login' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TEXT")

        # Audit log table
        cursor.execute('''CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, details TEXT, timestamp TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id))''')

        # Categories table
        cursor.execute('''CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY, name TEXT UNIQUE, description TEXT)''')

        # Warehouses table
        cursor.execute('''CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY, name TEXT UNIQUE, location TEXT)''')

        # Suppliers table
        cursor.execute('''CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY, name TEXT UNIQUE, contact TEXT, email TEXT, address TEXT)''')

        # Items table (expiry, warehouse, barcode)
        cursor.execute('''CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER, quantity INTEGER,
            price REAL, min_stock INTEGER, supplier TEXT, date_added TEXT, expiry_date TEXT, warehouse_id INTEGER, barcode TEXT,
            FOREIGN KEY (category_id) REFERENCES categories (id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses (id))''')

        # Purchase orders table
        cursor.execute('''CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY, supplier_id INTEGER, item_id INTEGER, quantity INTEGER, order_date TEXT, status TEXT,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY (item_id) REFERENCES items(id))''')

        # Add default admin user
        cursor.execute("INSERT OR IGNORE INTO users (id, username, password, role, email, last_login) VALUES (?, ?, ?, ?, ?, ?)", (1, 'admin', hashlib.sha256('admin'.encode()).hexdigest(), 'admin', 'admin@inventorypro.com', None))

        # Add default warehouse
        cursor.execute("INSERT OR IGNORE INTO warehouses VALUES (1, 'Main Warehouse', 'HQ')")

        conn.commit()
        conn.close()

    def execute_query(self, query, params=(), fetch=False, audit_user=None, audit_action=None, audit_details=None):
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute(query, params)
            result = cursor.fetchall() if fetch else None
            conn.commit()
            # Audit log
            if audit_user and audit_action:
                cursor.execute("INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)", (audit_user, audit_action, audit_details or str(params), datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
                conn.commit()
            return result
        except Exception as e:
            print(f"Database error: {e}")
            return None
        finally:
            if conn:
                conn.close()  # Always close connection

# Modern Styled Widget Base
class StyledWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.setStyleSheet("""
            QWidget 
            { 
                background-color: #f5f5f5; 
                font-family: 'Segoe UI'; 
            }
            QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox 
            { 
                padding: 8px; 
                border: 2px solid #ddd; 
                border-radius: 5px; 
                background-color: white; font-size: 14px; 
            }
            QLineEdit:focus, QComboBox:focus 
            { 
                border-color: #4CAF50; 
            }
            QPushButton 
            { 
                padding: 10px 20px; 
                background-color: #4CAF50; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                font-size: 14px; 
                font-weight: bold; 
            }
            QPushButton:hover 
            { 
                background-color: #45a049; 
            }
            QPushButton:pressed 
            { 
                background-color: #3d8b40; 
            }
            QTableWidget 
            { 
                gridline-color: #ddd; 
                background-color: white; 
                alternate-background-color: #f9f9f9; 
            }
            QTableWidget::item 
            { 
                padding: 8px; 
            }
            QTableWidget::item:selected 
            { 
                background-color: #4CAF50; color: white; 
            }
            QHeaderView::section 
            { 
                background-color: #2196F3; 
                color: white; 
                padding: 10px; 
                font-weight: bold; 
                border: none; 
            }
            QTabWidget::pane 
            { 
                border: 1px solid #ddd; 
                background-color: white; 
            }
            QTabBar::tab 
            { 
                background-color: #e0e0e0; 
                padding: 10px 20px; 
                margin-right: 2px; 
            }
            QTabBar::tab:selected 
            { 
                background-color: #4CAF50; 
                color: white; 
            }
            QGroupBox 
            { 
                font-weight: bold; 
                border: 2px solid #ddd; 
                border-radius: 5px; 
                margin: 10px; padding-top: 10px; 
            }
        """)
 
# Login Dialog
class LoginDialog(QDialog, StyledWidget):
    def __init__(self, db_manager):
        super().__init__()
        self.db_manager = db_manager
        self.user_role = None
        self.current_user_id = None
        self.setup_ui()
     
    def setup_ui(self):
        self.setWindowTitle("Inventory Management - Login")
        self.setFixedSize(400, 300)
         
        layout = QVBoxLayout()
         
        # Logo/Title
        title = QLabel("INVENTORY MANAGER")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("font-size: 24px; font-weight: bold; color: #2196F3; margin: 20px;")
         
        # Login form
        form = QFormLayout()
        self.username = QLineEdit()
        self.password = QLineEdit()
        self.password.setEchoMode(QLineEdit.Password)
        form.addRow("Username:", self.username)
        form.addRow("Password:", self.password)
         
        # Buttons
        btn_layout = QHBoxLayout()
        login_btn = QPushButton("Login")
        login_btn.clicked.connect(self.login)
        btn_layout.addWidget(login_btn)
         
        layout.addWidget(title)
        layout.addLayout(form)
        layout.addLayout(btn_layout)
        self.setLayout(layout)
     
    def login(self):
        username = self.username.text()
        password = hashlib.sha256(self.password.text().encode()).hexdigest()
         
        result = self.db_manager.execute_query(
            "SELECT id, role FROM users WHERE username=? AND password=?", 
            (username, password), fetch=True)
         
        if result:
            self.current_user_id = result[0][0]
            self.user_role = result[0][1]
            self.accept()
        else:
            QMessageBox.warning(self, "Error", "Invalid credentials!")
 
# Chart Widget
class ChartWidget(FigureCanvas):
    def __init__(self, parent=None):
        self.figure = Figure(figsize=(8, 6), facecolor='white')
        super().__init__(self.figure)
        self.setParent(parent)
         
    def plot_stock_levels(self, data):
        self.figure.clear()
        ax = self.figure.add_subplot(111)
         
        if data:
            items, quantities = zip(*data)
            colors = ['red' if q == 0 else 'orange' if q <= 5 else 'green' for q in quantities]
            ax.bar(range(len(items)), quantities, color=colors)
            ax.set_xticks(range(len(items)))
            ax.set_xticklabels(items, rotation=45, ha='right')
            ax.set_ylabel('Quantity')
            ax.set_title('Stock Levels')
         
        self.figure.tight_layout()
        self.draw()
 
# Main Application
class InventoryApp(QMainWindow, StyledWidget):
    def __init__(self):
        super().__init__()
        self.db_manager = DatabaseManager()
        self.current_user_role = None
        self.current_user_id = None
        self.categories = []
        self.setup_ui()
         
    def setup_ui(self):
        self.setWindowTitle("Advanced Inventory Management System")
        self.setGeometry(100, 100, 1200, 800)
         
        # Login first
        login_dialog = LoginDialog(self.db_manager)
        if login_dialog.exec_() == QDialog.Accepted:
            self.current_user_role = login_dialog.user_role
            self.current_user_id = login_dialog.current_user_id
        else:
            sys.exit()
         
        # Central widget with tabs
        central_widget = QTabWidget()
        self.setCentralWidget(central_widget)
         
        # Dashboard tab
        self.dashboard_widget = self.create_dashboard()
        central_widget.addTab(self.dashboard_widget, "Dashboard")
         
        # Items management tab
        self.items_widget = self.create_items_tab()
        central_widget.addTab(self.items_widget, "Items")
         
        # Categories tab
        self.categories_widget = self.create_categories_tab()
        central_widget.addTab(self.categories_widget, "Categories")
         
        # Reports tab
        self.reports_widget = self.create_reports_tab()
        central_widget.addTab(self.reports_widget, "Reports")
         
        # Toolbar
        self.create_toolbar()
         
        # Status bar
        self.statusBar().showMessage("Ready")
         
        # Load initial data
        self.load_categories()
        self.clean_invalid_records()
     
    def create_toolbar(self):
        """Create application toolbar"""
        toolbar = self.addToolBar("Main")
         
        # Refresh action
        refresh_action = QAction("Refresh", self)
        refresh_action.triggered.connect(self.refresh_all_data)
        toolbar.addAction(refresh_action)
         
        toolbar.addSeparator()
         
        # Export actions
        export_excel_action = QAction("Export Excel", self)
        export_excel_action.triggered.connect(self.export_to_excel)
        toolbar.addAction(export_excel_action)
         
        export_pdf_action = QAction("Export PDF", self)
        export_pdf_action.triggered.connect(self.export_to_pdf)
        toolbar.addAction(export_pdf_action)
         
        toolbar.addSeparator()
         
        # Logout action
        logout_action = QAction("Logout", self)
        logout_action.triggered.connect(self.logout)
        toolbar.addAction(logout_action)
     
    def create_dashboard(self):
        """Create dashboard with analytics"""
        widget = QWidget()
        layout = QVBoxLayout()
         
        # Stats cards
        stats_layout = QHBoxLayout()
         
        # Total items card
        total_items = len(self.db_manager.execute_query("SELECT * FROM items", fetch=True) or [])
        total_card = self.create_stat_card("Total Items", str(total_items), "#2196F3")
        stats_layout.addWidget(total_card)
         
        # Low stock items (quantity = 0)
        low_stock = len(self.db_manager.execute_query(
            "SELECT * FROM items WHERE quantity = 0", fetch=True) or [])
        low_stock_card = self.create_stat_card("Out of Stock", str(low_stock), "#f44336")
        stats_layout.addWidget(low_stock_card)
         
        # Total categories
        total_categories = len(self.db_manager.execute_query("SELECT * FROM categories", fetch=True) or [])
        categories_card = self.create_stat_card("Categories", str(total_categories), "#4CAF50")
        stats_layout.addWidget(categories_card)
         
        layout.addLayout(stats_layout)
         
        # Chart
        self.chart_widget = ChartWidget()
        layout.addWidget(self.chart_widget)
         
        # Load chart data
        self.load_chart_data()
         
        widget.setLayout(layout)
        return widget
     
    def create_stat_card(self, title, value, color):
        """Create a stat card widget"""
        card = QFrame()
        card.setFrameStyle(QFrame.Box)
        card.setStyleSheet(f"""
            QFrame {{ 
                background-color: white; 
                border: 2px solid {color}; 
                border-radius: 10px; 
                padding: 10px; 
            }}
        """)
        
        layout = QVBoxLayout()
        
        title_label = QLabel(title)
        title_label.setStyleSheet(f"font-size: 14px; color: {color}; font-weight: bold;")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        value_label = QLabel(value)
        value_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #333;")
        value_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        layout.addWidget(title_label)
        layout.addWidget(value_label)
        card.setLayout(layout)
        
        return card
     
    def load_chart_data(self):
        """Load data for dashboard chart"""
        items_data = self.db_manager.execute_query(
            "SELECT name, quantity FROM items ORDER BY quantity ASC LIMIT 10", fetch=True)
        if items_data:
            self.chart_widget.plot_stock_levels(items_data)
     
    def create_items_tab(self):
        """Create items management tab with All Items and Low Stock Items sub-tabs"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # Create tab widget for items
        items_tab_widget = QTabWidget()
        
        # All Items tab
        all_items_widget = self.create_all_items_widget()
        items_tab_widget.addTab(all_items_widget, "All Items")
        
        # Low Stock Items tab
        low_stock_widget = self.create_low_stock_widget()
        items_tab_widget.addTab(low_stock_widget, "Low Stock Items")
        
        layout.addWidget(items_tab_widget)
        widget.setLayout(layout)
        
        return widget
    
    def create_all_items_widget(self):
        """Create widget for all items management"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # Add item form
        form_group = QGroupBox("Add/Edit Item")
        form_layout = QFormLayout()
        
        self.item_name = QLineEdit()
        self.item_category = QComboBox()
        self.item_quantity = QSpinBox()
        self.item_quantity.setMaximum(99999)
        self.item_price = QDoubleSpinBox()
        self.item_price.setMaximum(99999.99)
        self.item_min_stock = QSpinBox()
        self.item_min_stock.setMaximum(99999)
        self.item_supplier = QLineEdit()
        self.item_barcode = QLineEdit()
        
        form_layout.addRow("Name:", self.item_name)
        form_layout.addRow("Category:", self.item_category)
        form_layout.addRow("Quantity:", self.item_quantity)
        form_layout.addRow("Price:", self.item_price)
        form_layout.addRow("Min Stock:", self.item_min_stock)
        form_layout.addRow("Supplier:", self.item_supplier)
        form_layout.addRow("Barcode:", self.item_barcode)
        
        # Buttons
        btn_layout = QHBoxLayout()
        add_btn = QPushButton("Add Item")
        add_btn.clicked.connect(self.add_item)
        update_btn = QPushButton("Update Item")
        update_btn.clicked.connect(self.update_item)
        delete_btn = QPushButton("Delete Item")
        delete_btn.clicked.connect(self.delete_item)
        clear_btn = QPushButton("Clear Form")
        clear_btn.clicked.connect(self.clear_item_form)
        
        btn_layout.addWidget(add_btn)
        btn_layout.addWidget(update_btn)
        btn_layout.addWidget(delete_btn)
        btn_layout.addWidget(clear_btn)
        
        form_layout.addRow(btn_layout)
        form_group.setLayout(form_layout)
        
        # Items table
        self.all_items_table = QTableWidget()
        self.all_items_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.all_items_table.cellClicked.connect(self.load_item_for_edit)
        
        layout.addWidget(form_group)
        layout.addWidget(self.all_items_table)
        
        # Load items
        self.load_all_items()
        
        widget.setLayout(layout)
        return widget
    
    def create_low_stock_widget(self):
        """Create widget for low stock items (quantity = 0)"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # Alert message
        alert_label = QLabel("⚠️ Items with Zero Stock - Immediate Attention Required!")
        alert_label.setStyleSheet("""
            QLabel {
                background-color: #ffebee;
                color: #c62828;
                padding: 10px;
                border: 2px solid #ef5350;
                border-radius: 5px;
                font-weight: bold;
                font-size: 16px;
            }
        """)
        alert_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # Low stock items table
        self.low_stock_table = QTableWidget()
        self.low_stock_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        
        # Refresh button
        refresh_btn = QPushButton("Refresh Low Stock Items")
        refresh_btn.clicked.connect(self.load_low_stock_items)
        
        layout.addWidget(alert_label)
        layout.addWidget(self.low_stock_table)
        layout.addWidget(refresh_btn)
        
        # Load low stock items
        self.load_low_stock_items()
        
        widget.setLayout(layout)
        return widget
    
    def load_all_items(self):
        """Load items with quantity > 0 into the table"""
        items = self.db_manager.execute_query("""
            SELECT i.id, i.name, c.name, i.quantity, i.price, i.min_stock, 
                   i.supplier, i.barcode, i.date_added
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.quantity > 0
            ORDER BY i.name
        """, fetch=True)
        
        if items:
            self.all_items_table.setRowCount(len(items))
            self.all_items_table.setColumnCount(9)
            self.all_items_table.setHorizontalHeaderLabels([
                "ID", "Name", "Category", "Quantity", "Price", "Min Stock", 
                "Supplier", "Barcode", "Date Added"
            ])
            
            for row, item in enumerate(items):
                for col, value in enumerate(item):
                    item_widget = QTableWidgetItem(str(value) if value is not None else "")
                    self.all_items_table.setItem(row, col, item_widget)
            
            self.all_items_table.resizeColumnsToContents()
        else:
            self.all_items_table.setRowCount(0)
    
    def load_low_stock_items(self):
        """Load items with quantity = 0 (without barcode)"""
        low_stock_items = self.db_manager.execute_query("""
            SELECT i.id, i.name, c.name, i.quantity, i.price, i.min_stock, i.supplier
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.quantity = 0
            ORDER BY i.name
        """, fetch=True)
        
        if low_stock_items:
            self.low_stock_table.setRowCount(len(low_stock_items))
            self.low_stock_table.setColumnCount(7)
            self.low_stock_table.setHorizontalHeaderLabels([
                "ID", "Name", "Category", "Quantity", "Price", "Min Stock", "Supplier"
            ])
            
            for row, item in enumerate(low_stock_items):
                for col, value in enumerate(item):
                    item_widget = QTableWidgetItem(str(value) if value is not None else "")
                    # Highlight all cells in red for low stock items
                    item_widget.setBackground(QColor("#ffebee"))
                    item_widget.setForeground(QColor("#c62828"))
                    self.low_stock_table.setItem(row, col, item_widget)
            
            self.low_stock_table.resizeColumnsToContents()
        else:
            self.low_stock_table.setRowCount(0)
            self.low_stock_table.setColumnCount(7)
            self.low_stock_table.setHorizontalHeaderLabels([
                "ID", "Name", "Category", "Quantity", "Price", "Min Stock", "Supplier"
            ])
    
    def load_categories(self):
        """Load categories for dropdown"""
        categories = self.db_manager.execute_query("SELECT id, name FROM categories", fetch=True)
        self.categories = categories or []
        
        self.item_category.clear()
        self.item_category.addItem("Select Category", 0)
        for cat_id, cat_name in self.categories:
            self.item_category.addItem(cat_name, cat_id)
    
    def add_item(self):
        """Add new item to inventory"""
        if not self.validate_item_form():
            return
        
        category_id = self.item_category.currentData()
        if category_id == 0:
            QMessageBox.warning(self, "Error", "Please select a category!")
            return
        
        # Check if item quantity is 0 and show warning
        quantity = self.item_quantity.value()
        if quantity == 0:
            reply = QMessageBox.question(self, "Low Stock Warning", 
                                       "You are adding an item with 0 quantity. This item will appear in the Low Stock Items tab. Continue?",
                                       QMessageBox.Yes | QMessageBox.No)
            if reply != QMessageBox.Yes:
                return
        
        self.db_manager.execute_query("""
            INSERT INTO items (name, category_id, quantity, price, min_stock, supplier, barcode, date_added)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.item_name.text(),
            category_id,
            quantity,
            self.item_price.value(),
            self.item_min_stock.value(),
            self.item_supplier.text(),
            self.item_barcode.text(),
            datetime.now().strftime("%Y-%m-%d")
        ), audit_user=self.current_user_id, audit_action="ADD_ITEM", 
        audit_details=f"Added item: {self.item_name.text()}")
        
        QMessageBox.information(self, "Success", "Item added successfully!")
        self.clear_item_form()
        self.refresh_all_data()
    
    def update_item(self):
        """Update selected item"""
        current_row = self.all_items_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "Error", "Please select an item to update!")
            return
        
        if not self.validate_item_form():
            return
        
        category_id = self.item_category.currentData()
        if category_id == 0:
            QMessageBox.warning(self, "Error", "Please select a category!")
            return
        
        item_id = self.all_items_table.item(current_row, 0).text()
        
        # Check if quantity is being changed to 0
        quantity = self.item_quantity.value()
        if quantity == 0:
            reply = QMessageBox.question(self, "Low Stock Warning", 
                                       "You are setting quantity to 0. This item will appear in the Low Stock Items tab. Continue?",
                                       QMessageBox.Yes | QMessageBox.No)
            if reply != QMessageBox.Yes:
                return
        
        self.db_manager.execute_query("""
            UPDATE items SET name=?, category_id=?, quantity=?, price=?, min_stock=?, supplier=?, barcode=?
            WHERE id=?
        """, (
            self.item_name.text(),
            category_id,
            quantity,
            self.item_price.value(),
            self.item_min_stock.value(),
            self.item_supplier.text(),
            self.item_barcode.text(),
            item_id
        ), audit_user=self.current_user_id, audit_action="UPDATE_ITEM", 
        audit_details=f"Updated item ID: {item_id}")
        
        QMessageBox.information(self, "Success", "Item updated successfully!")
        self.clear_item_form()
        self.refresh_all_data()
    
    def delete_item(self):
        """Delete selected item"""
        current_row = self.all_items_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "Error", "Please select an item to delete!")
            return
        
        item_id = self.all_items_table.item(current_row, 0).text()
        item_name = self.all_items_table.item(current_row, 1).text()
        
        reply = QMessageBox.question(self, "Confirm Delete", 
                                   f"Are you sure you want to delete '{item_name}'?",
                                   QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            self.db_manager.execute_query("DELETE FROM items WHERE id=?", (item_id,),
                                        audit_user=self.current_user_id, audit_action="DELETE_ITEM", 
                                        audit_details=f"Deleted item: {item_name}")
            QMessageBox.information(self, "Success", "Item deleted successfully!")
            self.refresh_all_data()
    
    def load_item_for_edit(self, row, column):
        """Load selected item data into form for editing"""
        item_id = self.all_items_table.item(row, 0).text()
        item = self.db_manager.execute_query(
            "SELECT name, category_id, quantity, price, min_stock, supplier, barcode FROM items WHERE id=?",
            (item_id,), fetch=True)
        
        if item:
            item_data = item[0]
            self.item_name.setText(item_data[0] or "")
            
            # Set category
            for i in range(self.item_category.count()):
                if self.item_category.itemData(i) == item_data[1]:
                    self.item_category.setCurrentIndex(i)
                    break
            
            self.item_quantity.setValue(item_data[2] or 0)
            self.item_price.setValue(item_data[3] or 0.0)
            self.item_min_stock.setValue(item_data[4] or 0)
            self.item_supplier.setText(item_data[5] or "")
            self.item_barcode.setText(item_data[6] or "")
    
    def validate_item_form(self):
        """Validate item form inputs"""
        if not self.item_name.text().strip():
            QMessageBox.warning(self, "Error", "Item name is required!")
            return False
        return True
    
    def clear_item_form(self):
        """Clear item form fields"""
        self.item_name.clear()
        self.item_category.setCurrentIndex(0)
        self.item_quantity.setValue(0)
        self.item_price.setValue(0.0)
        self.item_min_stock.setValue(0)
        self.item_supplier.clear()
        self.item_barcode.clear()
    
    def refresh_all_data(self):
        """Refresh all data tables and dashboard"""
        self.load_all_items()
        self.load_low_stock_items()
        self.load_categories_table()
        self.load_chart_data()
    
    def clean_invalid_records(self):
        """Clean invalid records from database"""
        try:
            # Remove items with empty or null names
            self.db_manager.execute_query(
                "DELETE FROM items WHERE name IS NULL OR TRIM(name) = ''",
                audit_user=self.current_user_id, 
                audit_action="CLEAN_DATABASE", 
                audit_details="Removed invalid item records"
            )
            print("Database cleaned: Invalid records removed")
        except Exception as e:
            print(f"Error cleaning database: {e}")
     
    def create_categories_tab(self):
        """Create categories management tab"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # Add category form
        form_group = QGroupBox("Add/Edit Category")
        form_layout = QFormLayout()
        
        self.category_name = QLineEdit()
        self.category_description = QLineEdit()
        
        form_layout.addRow("Name:", self.category_name)
        form_layout.addRow("Description:", self.category_description)
        
        # Buttons
        btn_layout = QHBoxLayout()
        add_cat_btn = QPushButton("Add Category")
        add_cat_btn.clicked.connect(self.add_category)
        update_cat_btn = QPushButton("Update Category")
        update_cat_btn.clicked.connect(self.update_category)
        delete_cat_btn = QPushButton("Delete Category")
        delete_cat_btn.clicked.connect(self.delete_category)
        
        btn_layout.addWidget(add_cat_btn)
        btn_layout.addWidget(update_cat_btn)
        btn_layout.addWidget(delete_cat_btn)
        
        form_layout.addRow(btn_layout)
        form_group.setLayout(form_layout)
        
        # Categories table
        self.categories_table = QTableWidget()
        self.categories_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.categories_table.cellClicked.connect(self.load_category_for_edit)
        
        layout.addWidget(form_group)
        layout.addWidget(self.categories_table)
        
        # Load categories
        self.load_categories_table()
        
        widget.setLayout(layout)
        return widget
    
    def load_categories_table(self):
        """Load categories into table"""
        categories = self.db_manager.execute_query("SELECT id, name, description FROM categories", fetch=True)
        
        if categories:
            self.categories_table.setRowCount(len(categories))
            self.categories_table.setColumnCount(3)
            self.categories_table.setHorizontalHeaderLabels(["ID", "Name", "Description"])
            
            for row, category in enumerate(categories):
                for col, value in enumerate(category):
                    self.categories_table.setItem(row, col, QTableWidgetItem(str(value) if value else ""))
            
            self.categories_table.resizeColumnsToContents()
        else:
            self.categories_table.setRowCount(0)
    
    def add_category(self):
        """Add new category"""
        name = self.category_name.text().strip()
        if not name:
            QMessageBox.warning(self, "Error", "Category name is required!")
            return
        
        self.db_manager.execute_query(
            "INSERT INTO categories (name, description) VALUES (?, ?)",
            (name, self.category_description.text()),
            audit_user=self.current_user_id, audit_action="ADD_CATEGORY", 
            audit_details=f"Added category: {name}")
        
        QMessageBox.information(self, "Success", "Category added successfully!")
        self.category_name.clear()
        self.category_description.clear()
        self.load_categories_table()
        self.load_categories()  # Refresh dropdown
    
    def update_category(self):
        """Update selected category"""
        current_row = self.categories_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "Error", "Please select a category to update!")
            return
        
        name = self.category_name.text().strip()
        if not name:
            QMessageBox.warning(self, "Error", "Category name is required!")
            return
        
        category_id = self.categories_table.item(current_row, 0).text()
        
        self.db_manager.execute_query(
            "UPDATE categories SET name=?, description=? WHERE id=?",
            (name, self.category_description.text(), category_id),
            audit_user=self.current_user_id, audit_action="UPDATE_CATEGORY", 
            audit_details=f"Updated category ID: {category_id}")
        
        QMessageBox.information(self, "Success", "Category updated successfully!")
        self.category_name.clear()
        self.category_description.clear()
        self.load_categories_table()
        self.load_categories()  # Refresh dropdown
    
    def delete_category(self):
        """Delete selected category"""
        current_row = self.categories_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "Error", "Please select a category to delete!")
            return
        
        category_id = self.categories_table.item(current_row, 0).text()
        category_name = self.categories_table.item(current_row, 1).text()
        
        # Check if category has items
        items_count = self.db_manager.execute_query(
            "SELECT COUNT(*) FROM items WHERE category_id=?", (category_id,), fetch=True)
        
        if items_count and items_count[0][0] > 0:
            QMessageBox.warning(self, "Error", f"Cannot delete category '{category_name}' as it has {items_count[0][0]} items associated with it!")
            return
        
        reply = QMessageBox.question(self, "Confirm Delete", f"Are you sure you want to delete category '{category_name}'?", QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            self.db_manager.execute_query("DELETE FROM categories WHERE id=?", (category_id,), audit_user=self.current_user_id, audit_action="DELETE_CATEGORY", audit_details=f"Deleted category: {category_name}")
            QMessageBox.information(self, "Success", "Category deleted successfully!")
            self.load_categories_table()
            self.load_categories()  # Refresh dropdown
    
    def load_category_for_edit(self, row, column):
        """Load selected category for editing"""
        category_id = self.categories_table.item(row, 0).text()
        category = self.db_manager.execute_query("SELECT name, description FROM categories WHERE id=?", (category_id,), fetch=True)
        
        if category:
            self.category_name.setText(category[0][0] or "")
            self.category_description.setText(category[0][1] or "")

    def create_reports_tab(self):
        """Create reports tab with enhanced low stock alerts"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # Report buttons
        btn_layout = QHBoxLayout()
        
        low_stock_btn = QPushButton("Low Stock Report")
        low_stock_btn.clicked.connect(self.generate_low_stock_report)
        
        full_inventory_btn = QPushButton("Full Inventory Report")
        full_inventory_btn.clicked.connect(self.generate_full_inventory_report)
        
        category_btn = QPushButton("Category Report")
        category_btn.clicked.connect(self.generate_category_report)
        
        btn_layout.addWidget(low_stock_btn)
        btn_layout.addWidget(full_inventory_btn)
        btn_layout.addWidget(category_btn)
        
        # Report display area
        self.report_text = QTextEdit()
        self.report_text.setReadOnly(True)
        
        layout.addLayout(btn_layout)
        layout.addWidget(self.report_text)
        
        widget.setLayout(layout)
        return widget
    
    def generate_low_stock_report(self):
        """Generate detailed low stock report with alerts"""
        self.report_text.clear()
        
        # Get items with quantity = 0 (excluding empty/null names)
        low_stock_items = self.db_manager.execute_query("""
            SELECT i.name, c.name, i.quantity, i.price, i.min_stock, i.supplier
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.quantity = 0 AND i.name IS NOT NULL AND TRIM(i.name) != ''
            ORDER BY i.name
        """, fetch=True)
        
        report = f"""
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                          CRITICAL STOCK DEPLETION ALERT                             ║
║                          IMMEDIATE EXECUTIVE ATTENTION REQUIRED                     ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

REPORT IDENTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generation Timestamp: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
Report Classification: URGENT - OUT OF STOCK INVENTORY ANALYSIS
Business Impact Level: CRITICAL - REVENUE AFFECTING

EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ZERO INVENTORY ITEMS DETECTED - IMMEDIATE SUPPLY CHAIN INTERVENTION REQUIRED

        """
        
        if low_stock_items:
            report += f"Critical Items Count: {len(low_stock_items)} products require immediate procurement action\n\n"
            
            # Calculate financial impact
            total_value = sum((item[3] or 0) for item in low_stock_items)
            potential_revenue_loss = total_value * 0.25  # Assuming 25% margin loss
            
            report += f"FINANCIAL IMPACT ASSESSMENT\n"
            report += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += f"Total Product Value at Risk: ${total_value:,.2f}\n"
            report += f"Estimated Revenue Impact: ${potential_revenue_loss:,.2f}\n"
            report += f"Supply Chain Disruption Level: HIGH\n\n"
            
            report += "DETAILED INVENTORY DEPLETION ANALYSIS\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += f"{'PRODUCT IDENTIFIER':<30} {'CLASSIFICATION':<20} {'QTY':<6} {'UNIT VALUE':<12} {'REORDER LVL':<12} {'SUPPLIER':<20}\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            
            for item in low_stock_items:
                name, category, quantity, price, min_stock, supplier = item
                product_name = (name or "UNNAMED_PRODUCT")[:29]
                category_name = (category or "UNCATEGORIZED")[:19]
                supplier_name = (supplier or "UNASSIGNED")[:19]
                
                report += f"{product_name:<30} {category_name:<20} {quantity:<6} ${price or 0:<11.2f} {min_stock or 0:<12} {supplier_name:<20}\n"
            
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            
            report += "EXECUTIVE ACTION REQUIREMENTS\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += "PRIORITY 1 (IMMEDIATE - NEXT 24 HOURS):\n"
            report += "• Initiate emergency supplier communication protocols\n"
            report += "• Activate expedited procurement procedures\n"
            report += "• Issue stock depletion notifications to sales operations\n\n"
            report += "PRIORITY 2 (SHORT-TERM - NEXT 72 HOURS):\n"
            report += "• Evaluate alternative supplier arrangements\n"
            report += "• Assess customer impact and communication strategy\n"
            report += "• Review procurement forecasting models\n\n"
            report += "PRIORITY 3 (STRATEGIC - NEXT 7 DAYS):\n"
            report += "• Conduct supply chain resilience assessment\n"
            report += "• Implement enhanced inventory monitoring protocols\n"
            report += "• Update minimum stock level parameters\n\n"
        else:
            report += "OPERATIONAL STATUS: OPTIMAL\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += "✅ EXCELLENT: All inventory items maintain positive stock levels\n"
            report += "✅ Supply chain operations performing within acceptable parameters\n"
            report += "✅ No immediate procurement actions required\n\n"
            report += "RECOMMENDATION: Continue standard inventory monitoring protocols\n\n"
        
        # Also check items with low stock (quantity <= min_stock but > 0)
        warning_items = self.db_manager.execute_query("""
            SELECT i.name, c.name, i.quantity, i.min_stock, i.price
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.quantity > 0 AND i.quantity <= i.min_stock AND i.name IS NOT NULL AND TRIM(i.name) != ''
            ORDER BY i.quantity ASC
        """, fetch=True)
        
        if warning_items:
            report += f"SECONDARY RISK ASSESSMENT - LOW INVENTORY WARNING\n"
            report += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += f"Items Operating Below Minimum Threshold: {len(warning_items)} products\n"
            report += f"Risk Level: MEDIUM - Proactive procurement recommended\n\n"
            
            for item in warning_items:
                name, category, quantity, min_stock, price = item
                product_name = (name or "UNNAMED_PRODUCT")[:25]
                category_name = (category or "UNCATEGORIZED")[:15]
                report += f"• {product_name} ({category_name}): Current Stock: {quantity} | Minimum Required: {min_stock} | Unit Value: ${price or 0:.2f}\n"
        
        self.report_text.setPlainText(report)
    
    def generate_full_inventory_report(self):
        """Generate full inventory report with low stock alerts"""
        self.report_text.clear()
        
        all_items = self.db_manager.execute_query("""
            SELECT i.name, c.name, i.quantity, i.price, i.min_stock, i.supplier, i.barcode, i.date_added
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.name IS NOT NULL AND TRIM(i.name) != ''
            ORDER BY i.name
        """, fetch=True)
        
        report = f"""
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                        COMPREHENSIVE INVENTORY ANALYSIS REPORT                      ║
║                              STRATEGIC OVERVIEW & INSIGHTS                          ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

REPORT METADATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generation Timestamp: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
Report Classification: COMPREHENSIVE INVENTORY ASSESSMENT
Analysis Scope: COMPLETE PRODUCT PORTFOLIO
Authorized Personnel: C-LEVEL EXECUTIVES & OPERATIONS MANAGEMENT

        """
        
        if all_items:
            # Summary statistics
            total_items = len(all_items)
            out_of_stock = len([item for item in all_items if item[2] == 0])
            low_stock = len([item for item in all_items if item[2] > 0 and item[2] <= (item[4] or 0)])
            total_value = sum((item[2] or 0) * (item[3] or 0) for item in all_items)
            available_items = total_items - out_of_stock
            
            report += f"STRATEGIC INVENTORY PERFORMANCE METRICS\n"
            report += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += f"Total Product Portfolio: {total_items:,} SKUs\n"
            report += f"Available Inventory: {available_items:,} products ({(available_items/total_items*100) if total_items > 0 else 0:.1f}%)\n"
            report += f"Critical Stock Depletion: {out_of_stock:,} products ({(out_of_stock/total_items*100) if total_items > 0 else 0:.1f}%)\n"
            report += f"Below Minimum Threshold: {low_stock:,} products ({(low_stock/total_items*100) if total_items > 0 else 0:.1f}%)\n"
            report += f"Total Portfolio Valuation: ${total_value:,.2f}\n"
            
            # Risk assessment
            risk_level = "LOW"
            risk_color = "🟢"
            if out_of_stock / total_items > 0.15:  # More than 15% out of stock
                risk_level = "CRITICAL"
                risk_color = "🔴"
            elif out_of_stock / total_items > 0.05:  # More than 5% out of stock
                risk_level = "HIGH"
                risk_color = "🟡"
            
            report += f"Supply Chain Risk Assessment: {risk_color} {risk_level}\n\n"
            
            # Alert section for critical items
            if out_of_stock > 0:
                report += f"CRITICAL OPERATIONAL ALERTS\n"
                report += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                report += f"🔴 IMMEDIATE ATTENTION: {out_of_stock} products completely depleted\n"
                out_of_stock_items = [item for item in all_items if item[2] == 0]
                
                report += f"High-Priority Restocking Requirements:\n"
                for item in out_of_stock_items[:5]:  # Show first 5
                    product_name = (item[0] or "UNNAMED_PRODUCT")[:25]
                    category_name = (item[1] or "UNCATEGORIZED")[:15]
                    report += f"   • {product_name} | {category_name} | Unit Value: ${item[3] or 0:.2f}\n"
                if len(out_of_stock_items) > 5:
                    report += f"   ... and {len(out_of_stock_items) - 5} additional critical items requiring procurement\n"
                report += "\n"
            
            # Full inventory listing
            report += "COMPLETE INVENTORY PORTFOLIO ANALYSIS\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += f"{'STATUS':<8} {'PRODUCT IDENTIFIER':<30} {'CLASSIFICATION':<20} {'QTY':<6} {'MIN':<6} {'UNIT VALUE':<12} {'TOTAL VALUE':<12} {'SUPPLIER':<20}\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            
            for item in all_items:
                name, category, quantity, price, min_stock, supplier, barcode, date_added = item
                value = (quantity or 0) * (price or 0)
                
                # Add professional status indicators
                status = ""
                status_text = ""
                if quantity == 0:
                    status = "🔴"
                    status_text = "DEPLETED"
                elif quantity <= (min_stock or 0) and quantity > 0:
                    status = "🟡"
                    status_text = "LOW"
                else:
                    status = "🟢"
                    status_text = "NORMAL"
                
                product_name = (name or "UNNAMED_PRODUCT")[:29]
                category_name = (category or "UNCATEGORIZED")[:19]
                supplier_name = (supplier or "UNASSIGNED")[:19]
                
                report += f"{status} {status_text:<6} {product_name:<30} {category_name:<20} {quantity:<6} {min_stock or 0:<6} ${price or 0:<11.2f} ${value:<11.2f} {supplier_name:<20}\n"
            
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            
            # Professional legend
            report += "OPERATIONAL STATUS CLASSIFICATION\n"
            report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            report += "🔴 DEPLETED: Zero inventory - Immediate procurement required\n"
            report += "🟡 LOW: Below minimum threshold - Proactive restocking recommended\n"
            report += "🟢 NORMAL: Adequate inventory levels - Standard monitoring protocols\n\n"
            
        else:
            report += "No items found in inventory.\n"
        
        self.report_text.setPlainText(report)
    
    def generate_category_report(self):
        """Generate category-wise report"""
        self.report_text.clear()
        
        categories = self.db_manager.execute_query("""
            SELECT c.name, COUNT(i.id), SUM(i.quantity), SUM(i.quantity * i.price)
            FROM categories c
            LEFT JOIN items i ON c.id = i.category_id
            GROUP BY c.id, c.name
            ORDER BY c.name
        """, fetch=True)
        
        report = f"""
        📁 CATEGORY REPORT 📁
        Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        
        """
        
        if categories:
            report += "=" * 70 + "\n"
            report += f"{'Category':<20} {'Items':<10} {'Total Qty':<15} {'Total Value':<15}\n"
            report += "=" * 70 + "\n"
            
            total_items = 0
            total_quantity = 0
            total_value = 0
            
            for category in categories:
                name, item_count, quantity, value = category
                item_count = item_count or 0
                quantity = quantity or 0
                value = value or 0
                
                report += f"{name:<20} {item_count:<10} {quantity:<15} ${value:<14.2f}\n"
                
                total_items += item_count
                total_quantity += quantity
                total_value += value
            
            report += "=" * 70 + "\n"
            report += f"{'TOTAL':<20} {total_items:<10} {total_quantity:<15} ${total_value:<14.2f}\n"
        else:
            report += "No categories found.\n"
        
        self.report_text.setPlainText(report)
    
    def refresh_all_data(self):
        """Refresh all data in the application"""
        # Refresh dashboard
        total_items = len(self.db_manager.execute_query("SELECT * FROM items", fetch=True) or [])
        low_stock = len(self.db_manager.execute_query("SELECT * FROM items WHERE quantity = 0", fetch=True) or [])
        
        # Refresh items tables
        self.load_all_items()
        self.load_low_stock_items()
        
        # Refresh categories
        self.load_categories()
        self.load_categories_table()
        
        # Refresh chart
        self.load_chart_data()
        
        self.statusBar().showMessage("Data refreshed successfully")
    
    def export_to_excel(self):
        """Export inventory data to Excel"""
        try:
            items = self.db_manager.execute_query("""
                SELECT i.name, c.name, i.quantity, i.price, i.min_stock, i.supplier, i.barcode, i.date_added
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.id
                ORDER BY i.name
            """, fetch=True)
            
            if items:
                df = pd.DataFrame(items, columns=[
                    'Name', 'Category', 'Quantity', 'Price', 'Min Stock', 
                    'Supplier', 'Barcode', 'Date Added'
                ])
                
                filename = f"inventory_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                df.to_excel(filename, index=False)
                QMessageBox.information(self, "Success", f"Data exported to {filename}")
            else:
                QMessageBox.warning(self, "Warning", "No data to export!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to export: {str(e)}")
    
    def export_to_pdf(self):
        """Export inventory report to PDF with separate sections for available and out-of-stock items"""
        try:
            filename = f"inventory_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            doc = SimpleDocTemplate(filename, pagesize=letter)
            
            # Get all items
            all_items = self.db_manager.execute_query("""
                SELECT i.name, c.name, i.quantity, i.price, i.min_stock
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.id
                ORDER BY i.name
            """, fetch=True)
            
            # Separate items by stock status
            available_items = [item for item in all_items if item[2] > 0]
            out_of_stock_items = [item for item in all_items if item[2] == 0]
            
            # Build PDF content
            story = []
            styles = getSampleStyleSheet()
            
            # Title
            title = Paragraph("Complete Inventory Report", styles['Title'])
            story.append(title)
            story.append(Spacer(1, 12))
            
            # Date and summary
            date_p = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
            story.append(date_p)
            
            summary = Paragraph(f"Total Items: {len(all_items)} | Available: {len(available_items)} | Out of Stock: {len(out_of_stock_items)}", styles['Normal'])
            story.append(summary)
            story.append(Spacer(1, 20))
            
            # Available Items Section
            if available_items:
                available_title = Paragraph("Available Items", styles['Heading2'])
                story.append(available_title)
                story.append(Spacer(1, 12))
                
                # Available items table
                available_data = [['Name', 'Category', 'Quantity', 'Price', 'Min Stock']]
                for item in available_items:
                    available_data.append([
                        item[0], item[1] or 'N/A', str(item[2]), f"${item[3]:.2f}", str(item[4] or 0)
                    ])
                
                available_table = Table(available_data)
                available_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.green),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(available_table)
                story.append(Spacer(1, 20))
            
            # Out of Stock Items Section
            if out_of_stock_items:
                # Critical alert
                alert = Paragraph("⚠️ CRITICAL ALERT: Out of Stock Items", styles['Heading2'])
                story.append(alert)
                story.append(Spacer(1, 12))
                
                # Out of stock items table
                out_of_stock_data = [['Name', 'Category', 'Quantity', 'Price', 'Min Stock']]
                for item in out_of_stock_items:
                    out_of_stock_data.append([
                        item[0], item[1] or 'N/A', str(item[2]), f"${item[3]:.2f}", str(item[4] or 0)
                    ])
                
                out_of_stock_table = Table(out_of_stock_data)
                out_of_stock_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.red),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.mistyrose),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(out_of_stock_table)
                story.append(Spacer(1, 12))
                
                # Action required note
                action_note = Paragraph("Immediate Action Required: Contact suppliers for restocking these items.", styles['Normal'])
                story.append(action_note)
            else:
                # Good news message
                good_news = Paragraph("✅ Good News: All items are currently in stock!", styles['Heading3'])
                story.append(good_news)
            
            doc.build(story)
            QMessageBox.information(self, "Success", f"Report exported to {filename}")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to export PDF: {str(e)}")
    
    def logout(self):
        """Logout and show login dialog"""
        reply = QMessageBox.question(self, "Logout", "Are you sure you want to logout?",
                                   QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            self.close()
            self.__init__()

def main():
    app = QApplication(sys.argv)
    
    # Set application style
    app.setStyle('Fusion')
    
    # Create and show main window
    window = InventoryApp()
    window.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()