

// --- CATEGORIES ---
export const getCategories = () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('categories');
    return data ? JSON.parse(data) : [];
};

export const saveCategories = (categories: any[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('categories', JSON.stringify(categories));
};

// --- ITEMS ---
export const getItems = () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('items');
    return data ? JSON.parse(data) : [];
};

export const saveItems = (items: any[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('items', JSON.stringify(items));
};

// --- SOLD ITEMS ---
export const getSoldItems = () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('soldItems');
    return data ? JSON.parse(data) : [];
};

export const saveSoldItems = (soldItems: any[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('soldItems', JSON.stringify(soldItems));
};
