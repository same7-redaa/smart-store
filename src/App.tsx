import React, { useState, useEffect } from 'react';
import { Layout, PageType } from './components/Layout';
import { AppProvider } from './context/AppContext';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Inventory } from './pages/Inventory';
import { AddProduct } from './pages/AddProduct';
import { ViewProduct } from './pages/ViewProduct';
import { Shipping, Customers, EditCustomer, Purchases, System } from './pages/OtherPages';
import { Expenses } from './pages/Expenses';
import { AddExpense } from './pages/AddExpense';
import { ViewSupplier } from './pages/ViewSupplier';
import { Categories } from './pages/Categories';
import { AddCategory } from './pages/AddCategory';
import { AddShippingCompany } from './pages/AddShippingCompany';
import { AddSupplier } from './pages/AddSupplier';
import { AddOrder } from './pages/AddOrder';
import { ViewOrder } from './pages/ViewOrder';
import { LoginPage } from './pages/LoginPage';
import { AddUser } from './pages/AddUser';
import { hasPermission } from './pages/Users';
import { Wastage } from './pages/Wastage';
import { AddWastage } from './pages/AddWastage';
import { Attributes } from './pages/Attributes';
import { pullAndMergeFromCloud } from './utils/sync';


export default function App() {
  const [activePage, setActivePage] = useState<PageType>('dashboard');
  const [session, setSession] = useState<{ name: string; username: string; role: string } | null>(() => {
    const raw = localStorage.getItem('my_session');
    return raw ? JSON.parse(raw) : null;
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // 1. Initial Cloud Data Pull on login
  useEffect(() => {
    if (session) {
      pullAndMergeFromCloud();
    }
  }, [session]);

  // 2. Listen to data refreshed events to force page re-render with latest synced data
  useEffect(() => {
    const handleRefreshed = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('local-data-refreshed', handleRefreshed);
    return () => {
      window.removeEventListener('local-data-refreshed', handleRefreshed);
    };
  }, []);

  if (!session) {
    return <LoginPage onLogin={s => setSession(s)} />;
  }

  function canAccess(page: string): boolean {
    if (page === 'wastage' || page === 'categories' || page === 'attributes') return hasPermission(session, 'inventory');
    if (page.startsWith('add-') || page.startsWith('edit-') || page.startsWith('view-')) {
      const baseMap: Record<string, string> = {
        'add-product': 'inventory', 'edit-product': 'inventory', 'view-product': 'inventory',
        'add-category': 'inventory', 'add-wastage': 'inventory',
        'add-order': 'orders', 'edit-order': 'orders', 'view-order': 'orders',
        'add-shipping-company': 'shipping', 'edit-shipping-company': 'shipping',
        'edit-customer': 'customers',
        'add-supplier': 'purchases', 'edit-supplier': 'purchases', 'view-supplier': 'purchases',
        'add-expense': 'expenses', 'edit-expense': 'expenses',
        'add-user': 'system', 'edit-user': 'system',
      };
      const parent = baseMap[page];
      if (parent) return hasPermission(session, parent);
    }
    return hasPermission(session, page);
  }

  function handleSetPage(page: PageType) {
    if (page !== 'dashboard' && !canAccess(page)) return;
    setActivePage(page);
  }

  const renderPage = () => {
    if (activePage !== 'dashboard' && !canAccess(activePage)) return <Dashboard />;

    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <Orders setActivePage={handleSetPage} />;
      case 'add-order':
        return <AddOrder setActivePage={handleSetPage} />;
      case 'edit-order':
        return <AddOrder setActivePage={handleSetPage} isEditing={true} />;
      case 'view-order':
        return <ViewOrder setActivePage={handleSetPage} />;
      case 'inventory':
        return <Inventory setActivePage={handleSetPage} />;
      case 'add-product':
        return <AddProduct setActivePage={handleSetPage} />;
      case 'edit-product':
        return <AddProduct setActivePage={handleSetPage} isEditing={true} />;
      case 'view-product':
        return <ViewProduct setActivePage={handleSetPage} />;
      case 'shipping':
        return <Shipping setActivePage={handleSetPage} />;
      case 'add-shipping-company':
        return <AddShippingCompany setActivePage={handleSetPage} />;
      case 'edit-shipping-company':
        return <AddShippingCompany setActivePage={handleSetPage} isEditing={true} />;
      case 'customers':
        return <Customers setActivePage={handleSetPage} />;
      case 'edit-customer':
        return <EditCustomer setActivePage={handleSetPage} />;
      case 'purchases':
        return <Purchases setActivePage={handleSetPage} />;
      case 'add-supplier':
        return <AddSupplier setActivePage={handleSetPage} />;
      case 'edit-supplier':
        return <AddSupplier setActivePage={handleSetPage} isEditing={true} />;
      case 'view-supplier':
        return <ViewSupplier setActivePage={handleSetPage} />;
      case 'categories':
        return <Categories setActivePage={handleSetPage} />;
      case 'add-category':
        return <AddCategory setActivePage={handleSetPage} />;
      case 'expenses':
        return <Expenses setActivePage={handleSetPage} />;
      case 'add-expense':
        return <AddExpense setActivePage={handleSetPage} />;
      case 'edit-expense':
        return <AddExpense setActivePage={handleSetPage} isEditing={true} />;
      case 'wastage':
        return <Wastage setActivePage={handleSetPage} />;
      case 'add-wastage':
        return <AddWastage setActivePage={handleSetPage} />;
      case 'attributes':
        return <Attributes setActivePage={handleSetPage} />;
      case 'system':
        return <System setActivePage={handleSetPage} />;
      case 'add-user':
        return <AddUser setActivePage={handleSetPage} />;
      case 'edit-user':
        return <AddUser setActivePage={handleSetPage} editUserId={localStorage.getItem('edit_user_id') || undefined} />;
      default:
        return <Dashboard />;
    }
  };

  function handleLogout() {
    localStorage.removeItem('my_session');
    setSession(null);
  }

  return (
    <AppProvider>
      <Layout activePage={activePage} setActivePage={handleSetPage} session={session} onLogout={handleLogout}>
        <div key={refreshKey} className="w-full h-full">
          {renderPage()}
        </div>
      </Layout>
    </AppProvider>
  );
}

