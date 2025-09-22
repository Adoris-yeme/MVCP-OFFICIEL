import React, { useState, createContext, useContext, useEffect } from 'react';
import { CheckCircleIcon, AlertTriangleIcon } from '../components/icons.tsx';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ToastComponent: React.FC<{message: string; type: 'success' | 'error' | 'info'; onClose: () => void}> = ({ message, type, onClose }) => {
    const styles = {
        success: { bg: 'bg-green-600', icon: <CheckCircleIcon className="h-6 w-6 text-white"/> },
        error: { bg: 'bg-red-600', icon: <AlertTriangleIcon className="h-6 w-6 text-white"/> },
        info: { bg: 'bg-blue-600', icon: <AlertTriangleIcon className="h-6 w-6 text-white"/> },
    };

    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-5 right-5 p-4 rounded-lg text-white shadow-lg flex items-center space-x-4 z-50 ${styles[type].bg} animate-fade-in-up`}>
            {styles[type].icon}
            <span>{message}</span>
            <button onClick={onClose} className="text-xl font-bold opacity-70 hover:opacity-100">&times;</button>
        </div>
    );
};

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info', id: number} | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, id: Date.now() });
    };
    
    const closeToast = () => setToast(null);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && <ToastComponent key={toast.id} message={toast.message} type={toast.type} onClose={closeToast} />}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};