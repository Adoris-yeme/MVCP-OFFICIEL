import React, { useState, useEffect, useMemo } from 'react';
import { Event } from '../types.ts';
import { api } from '../services/api.ts';
import { SpinnerIcon, PencilIcon, TrashIcon, PlusCircleIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';

// Reusable Modal Component
const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// Image Compression Utility
const compressImage = (file: File, maxSize = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("FileReader failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                let { width, height } = img;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// Form for adding/editing an Event
const EventForm: React.FC<{ event: Partial<Event>, onSave: (data: Omit<Event, 'id'>, eventId?: string) => void, onCancel: () => void }> = ({ event, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ ...event, date: event.date ? new Date(event.date).toISOString().split('T')[0] : '' });
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImage(file, 1024); // Max size 1024px
                setFormData(prev => ({ ...prev, imageUrl: compressedDataUrl }));
                showToast("L'image a été optimisée et ajoutée.", 'success');
            } catch (error) {
                console.error("Image compression error:", error);
                showToast("Erreur lors de la compression de l'image.", 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.date || !formData.location) {
            showToast("Veuillez remplir le titre, la date et le lieu.", 'error');
            return;
        }
        setIsSaving(true);
        const { id, ...saveData } = formData;
        
        const dataToSubmit: Omit<Event, 'id'> = {
            title: saveData.title!,
            description: saveData.description || '',
            date: new Date(saveData.date!).toISOString(),
            location: saveData.location!,
            imageUrl: saveData.imageUrl || '',
            status: saveData.status || 'draft',
        };

        await onSave(dataToSubmit, id);
        setIsSaving(false);
    };
    
    const inputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className={labelClass}>Titre de l'évènement</label>
                <input type="text" id="title" name="title" value={formData.title || ''} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={4} className={inputClass}></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className={labelClass}>Date</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label htmlFor="location" className={labelClass}>Lieu</label>
                    <input type="text" id="location" name="location" value={formData.location || ''} onChange={handleChange} className={inputClass} required />
                </div>
            </div>
            <div>
                <label className={labelClass}>Image de l'évènement</label>
                <div className="mt-1 flex items-center space-x-4 p-3 border-2 border-dashed rounded-lg bg-gray-50">
                    {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="Aperçu" className="w-24 h-24 object-cover rounded-md shadow-sm" />
                    ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-sm">
                            Aperçu
                        </div>
                    )}
                    <div className="flex-grow">
                        <label htmlFor="imageUpload" className="cursor-pointer inline-block bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <span>{formData.imageUrl ? 'Changer' : 'Choisir une image'}</span>
                            <input 
                                type="file" 
                                id="imageUpload" 
                                name="imageUpload"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleImageUpload}
                                className="sr-only"
                            />
                        </label>
                        {formData.imageUrl && (
                            <button type="button" onClick={() => setFormData(prev => ({...prev, imageUrl: ''}))} className="ml-3 text-sm text-red-600 hover:underline font-semibold">
                                Supprimer
                            </button>
                        )}
                        <p className="text-xs text-gray-500 mt-2">L'image sera automatiquement compressée. Pas de limite de taille.</p>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="status" className={labelClass}>Statut</label>
                <select id="status" name="status" value={formData.status || 'draft'} onChange={handleChange} className={inputClass} required>
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Annuler</button>
                <button type="submit" disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 disabled:bg-blue-300">
                    {isSaving && <SpinnerIcon className="h-5 w-5"/>}
                    <span>Enregistrer</span>
                </button>
            </div>
        </form>
    );
};

// FIX: Add main EventManagement component and export it as default.
// Main Management Component
const EventManagement: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemToDeleteName, setItemToDeleteName] = useState('');

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const fetchedEvents = await api.getEvents();
            setEvents(fetchedEvents);
        } catch (err: any) {
            showToast('Erreur lors du chargement des évènements.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const filteredEvents = useMemo(() => {
        if (!searchTerm) return events;
        const lowercasedFilter = searchTerm.toLowerCase();
        return events.filter(e =>
            e.title.toLowerCase().includes(lowercasedFilter) ||
            e.location.toLowerCase().includes(lowercasedFilter)
        );
    }, [events, searchTerm]);

    const handleAdd = () => {
        setEditingEvent({ title: '', description: '', date: new Date().toISOString().split('T')[0], location: '', status: 'draft' });
        setIsModalOpen(true);
    };

    const handleEdit = (event: Event) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = (eventId: string, eventTitle: string) => {
        setItemToDelete(eventId);
        setItemToDeleteName(eventTitle);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteEvent(itemToDelete);
            showToast('Évènement supprimé avec succès.', 'success');
            await fetchEvents();
        } catch (err: any) {
            showToast(`Erreur : ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    
    const handleSave = async (data: Omit<Event, 'id'>, eventId?: string) => {
        try {
            if (eventId) {
                await api.updateEvent(eventId, data);
                showToast('Évènement mis à jour.', 'success');
            } else {
                await api.addEvent(data);
                showToast('Évènement ajouté.', 'success');
            }
            setIsModalOpen(false);
            await fetchEvents();
        } catch (err: any) {
            showToast(`Erreur : ${err.message}`, 'error');
        }
    };

    if (loading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-10 w-10 text-blue-600" /></div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <input
                    type="text"
                    placeholder="Rechercher un évènement..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="p-2 border rounded-md w-full md:w-auto flex-grow"
                 />
                 <button onClick={handleAdd} className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg w-full md:w-auto">
                     <PlusCircleIcon className="h-5 w-5"/>
                     <span>Ajouter un Évènement</span>
                 </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                     <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Titre</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Lieu</th>
                            <th className="px-6 py-3">Statut</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvents.map(e => (
                             <tr key={e.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{e.title}</td>
                                <td className="px-6 py-4">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                                <td className="px-6 py-4">{e.location}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${e.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {e.status === 'published' ? 'Publié' : 'Brouillon'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex justify-end items-center space-x-3">
                                    <button onClick={() => handleEdit(e)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full" title="Modifier"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => handleDeleteRequest(e.id, e.title)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" title="Supprimer"><TrashIcon className="h-5 w-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredEvents.length === 0 && (
                    <p className="text-center text-gray-500 py-6">Aucun évènement trouvé.</p>
                )}
            </div>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent?.id ? "Modifier l'Évènement" : "Ajouter un Évènement"}>
                {editingEvent && <EventForm event={editingEvent} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />}
            </Modal>
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Supprimer l'Évènement"
                message={`Êtes-vous sûr de vouloir supprimer l'évènement "${itemToDeleteName}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                isConfirming={isDeleting}
            />
        </div>
    );
};

export default EventManagement;