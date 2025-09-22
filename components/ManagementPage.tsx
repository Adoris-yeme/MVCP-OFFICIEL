import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { UserRole } from '../types.ts';
import PastorManagement from './PastorManagement.tsx';
import CellManagement from './CellManagement.tsx';
import DistrictManagement from './DistrictManagement.tsx';
import GroupManagement from './GroupManagement.tsx';
import EventManagement from './EventManagement.tsx';
import HierarchyView from './HierarchyView.tsx';

const ManagementPage: React.FC = () => {
    const { user } = useAuth();
    
    if (!user) {
        return null; // Or a loading/error state
    }

    // Define tabs available to the user based on their role
    const availableTabs = [
        { id: 'cells', label: 'Cellules' },
    ];

    if (user.role === UserRole.NATIONAL_COORDINATOR) {
        availableTabs.unshift({ id: 'hierarchy', label: 'Hiérarchie' });
        availableTabs.push(
            { id: 'groups', label: 'Groupes' },
            { id: 'districts', label: 'Districts' },
            { id: 'pastors', label: 'Responsables' },
            { id: 'events', label: 'Évènements' }
        );
    }
    
    const [activeTab, setActiveTab] = useState(availableTabs[0].id);


    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tabId
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'hierarchy':
                 return user.role === UserRole.NATIONAL_COORDINATOR ? (
                    <section id="hierarchy-view">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Visualisation de la Hiérarchie</h2>
                        <HierarchyView />
                    </section>
                ) : null;
            case 'cells':
                return (
                    <section id="cell-management">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Gestion des Cellules</h2>
                        <CellManagement user={user} />
                    </section>
                );
            case 'groups':
                 return user.role === UserRole.NATIONAL_COORDINATOR ? (
                    <section id="group-management">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Gestion des Groupes</h2>
                        <GroupManagement />
                    </section>
                ) : null;
            case 'districts':
                return user.role === UserRole.NATIONAL_COORDINATOR ? (
                    <section id="district-management">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Gestion des Districts</h2>
                        <DistrictManagement />
                    </section>
                ) : null;
            case 'pastors':
                 return user.role === UserRole.NATIONAL_COORDINATOR ? (
                    <section id="pastor-management">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Gestion des Responsables (Pasteurs)</h2>
                        <PastorManagement />
                    </section>
                 ) : null;
            case 'events':
                return user.role === UserRole.NATIONAL_COORDINATOR ? (
                    <section id="event-management">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Gestion des Évènements</h2>
                        <EventManagement />
                    </section>
                ) : null;
            default:
                // Fallback to cell management if an invalid tab is selected
                return (
                     <section id="cell-management">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Gestion des Cellules</h2>
                        <CellManagement user={user} />
                    </section>
                );
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Centre de Gestion</h1>
                <p className="text-gray-600 mt-1">Gérez la structure, les cellules, et les responsables du ministère.</p>
            </div>
            
            <div className="bg-white p-3 rounded-xl shadow-md">
                <nav className="flex space-x-2 flex-wrap" aria-label="Tabs">
                    {availableTabs.map(tab => (
                         <TabButton key={tab.id} tabId={tab.id} label={tab.label} />
                    ))}
                </nav>
            </div>
            
            <div className="mt-6 animate-fade-in">
                {renderActiveTab()}
            </div>
        </div>
    );
};

export default ManagementPage;