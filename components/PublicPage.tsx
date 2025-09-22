import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Report, Event } from '../types.ts';
import { SpinnerIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.tsx';

const EventCard: React.FC<{ event: Event }> = ({ event }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300 h-full">
        {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="h-48 w-full object-cover"/>}
        <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 my-2">
                <CalendarIcon className="h-5 w-5 text-blue-600"/>
                <span>{new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <p className="text-sm text-gray-600 font-semibold">{event.location}</p>
            <p className="text-gray-700 mt-3 flex-grow">{event.description}</p>
        </div>
    </div>
);


const PublicPage: React.FC = () => {
    const [testimony, setTestimony] = useState<Report | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const eventsData = await api.getPublicEvents();
                setEvents(eventsData);

                let testimonyData = await api.getFeaturedTestimony();
                if (!testimonyData) {
                    testimonyData = await api.getRandomPoignantTestimony();
                }
                setTestimony(testimonyData);
            } catch (error) {
                console.error("Erreur lors du chargement des annonces:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    
    useEffect(() => {
        // Reset index if events change to avoid out-of-bounds
        setCurrentIndex(0);
    }, [events]);

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % events.length);
    };

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + events.length) % events.length);
    };


    if (loading) {
        return <div className="flex justify-center items-center p-20"><SpinnerIcon className="h-16 w-16 text-blue-700"/></div>;
    }

    const renderEvents = () => {
        if (events.length === 0) {
            return (
                <div className="text-center bg-white p-12 rounded-xl shadow-md">
                    <CalendarIcon className="mx-auto h-16 w-16 text-gray-300" />
                    <h3 className="mt-4 text-xl font-semibold text-gray-800">Aucun évènement à venir</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Revenez bientôt pour de nouvelles annonces.
                    </p>
                </div>
            );
        }

        if (events.length <= 3) {
            return (
                <div className={`grid gap-8 ${
                    events.length === 1
                        ? 'grid-cols-1 max-w-2xl mx-auto'
                        : events.length === 2
                        ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                    {events.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            );
        }
        
        return (
            <div className="relative max-w-2xl mx-auto">
                <div className="overflow-hidden rounded-xl">
                    <div
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                    >
                        {events.map(event => (
                            <div key={event.id} className="flex-shrink-0 w-full">
                               <div className="px-1 py-1">
                                  <EventCard event={event} />
                               </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handlePrev}
                    className="absolute top-1/2 -left-4 md:-left-12 transform -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow-md transition z-10"
                    aria-label="Évènement précédent"
                >
                    <ChevronLeftIcon className="h-6 w-6 text-gray-700" />
                </button>
                <button
                    onClick={handleNext}
                    className="absolute top-1/2 -right-4 md:-right-12 transform -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow-md transition z-10"
                    aria-label="Évènement suivant"
                >
                    <ChevronRightIcon className="h-6 w-6 text-gray-700" />
                </button>
                
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {events.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-3 h-3 rounded-full ${currentIndex === index ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-300`}
                            aria-label={`Aller à l'évènement ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
            <header className="text-center">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Annonces de la Communauté</h1>
                <p className="text-lg text-gray-600">Restez informés des évènements à venir et laissez-vous inspirer par ce que Dieu fait.</p>
            </header>

            {/* --- Testimony of the Day --- */}
            {testimony && (
                <section>
                    <h2 className="text-2xl font-bold text-gray-700 mb-4 text-center">✨ Témoignage du Jour ✨</h2>
                    <div className="max-w-3xl mx-auto bg-yellow-50 p-6 rounded-xl shadow-lg border-t-4 border-yellow-400">
                        <p className="text-lg text-gray-800 italic text-center">"{testimony.poignantTestimony}"</p>
                        <p className="text-right text-sm font-semibold text-gray-600 mt-4">- Cellule {testimony.cellName} ({testimony.region})</p>
                    </div>
                </section>
            )}

            {/* --- Upcoming Events --- */}
            <section className="pb-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Évènements à Venir</h2>
                {renderEvents()}
            </section>
        </div>
    );
};

export default PublicPage;