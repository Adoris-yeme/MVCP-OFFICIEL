import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { UserRole } from './types.ts';
import { api } from './services/api.ts';
import { LogoIcon, MenuIcon, XIcon, SpinnerIcon, PreachIcon, PrayerGroupIcon, DocumentTextIcon } from './components/icons.tsx';
import ReportForm from './components/ReportForm.tsx';
import Dashboard from './components/Dashboard.tsx';
import ManagementPage from './components/ManagementPage.tsx';
import ResourcesPage from './components/ResourcesPage.tsx';
import RegisterPage from './components/RegisterPage.tsx';
import PublicPage from './components/PublicPage.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { ToastProvider, useToast } from './contexts/ToastContext.tsx';

// --- Layout Components ---
const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        navigate('/');
    };
    
    const baseLinkClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    const activeLinkClass = "bg-blue-800 text-white";
    const inactiveLinkClass = "text-blue-100 hover:bg-blue-600 hover:text-white";

    const NavLinks = ({ isMobile }: {isMobile?: boolean}) => {
      const linkClasses = `${baseLinkClass} ${isMobile ? 'block w-full text-left mt-1' : 'inline-block'}`;
      return (
        <>
          <NavLink to="/" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive && !isMobile ? activeLinkClass : inactiveLinkClass}`}>Accueil</NavLink>
          <NavLink to="/annonces" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Annonces</NavLink>
          <NavLink to="/rapport" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Rapport</NavLink>
          {user && (
            <>
              <NavLink to="/resources" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Ressources</NavLink>
              <NavLink to="/admin" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Tableau de bord</NavLink>
              <NavLink to="/management" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Gestion</NavLink>
            </>
          )}
          {user ? (
            <button onClick={handleLogout} className={`${linkClasses} ${inactiveLinkClass}`}>Déconnexion</button>
          ) : (
             <>
                <NavLink to="/login" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Connexion</NavLink>
                <NavLink to="/register" onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>S'inscrire</NavLink>
             </>
          )}
        </>
      )
    };

    return (
        <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-3">
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8" />
                        <span className="font-bold text-xl">MVCP-BENIN</span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-1">
                       <NavLinks />
                    </div>
                    <div className="md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Ouvrir le menu">
                            {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
                 {isMenuOpen && (
                    <div className="md:hidden pb-4">
                        <NavLinks isMobile />
                    </div>
                )}
            </div>
        </header>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-gray-800 text-white mt-auto">
        <div className="container mx-auto px-6 py-4 text-center text-sm">
            &copy; {new Date().getFullYear()} Ministère de la Vie Chrétienne Profonde au BENIN. Tous droits réservés.
        </div>
    </footer>
);

// --- Page Components ---
const HomePage: React.FC = () => {
    return (
        <div className="text-center">
            <div className="bg-white p-8 sm:p-12 rounded-xl shadow-2xl max-w-4xl mx-auto flex flex-col items-center">
                <LogoIcon className="h-32 w-32 mb-6" />
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">
                    Ministère de la Vie Chrétienne Profonde au BENIN
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-8">
                    Les cellules de maison, la croissance de l'Église.
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <Link to="/rapport" className="bg-blue-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-800 transition-transform transform hover:scale-105 shadow-lg">
                        Soumettre un Rapport
                    </Link>
                    <Link to="/login" className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-800 transition-transform transform hover:scale-105 shadow-lg">
                        Accès Administrateur
                    </Link>
                </div>

                 {/* NEW Call to action Section */}
                <div className="mt-12 w-full">
                    <div className="max-w-2xl mx-auto p-6 bg-blue-50 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <h2 className="text-2xl font-bold text-gray-700">Prêt à soumettre votre rapport ?</h2>
                        <p className="text-gray-600 mt-2 mb-6">La soumission régulière des rapports est essentielle pour le suivi et la croissance de nos cellules. Ne tardez pas !</p>
                        <Link to="/rapport" className="inline-flex items-center justify-center bg-blue-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-800 transition-transform transform hover:scale-105 shadow-lg">
                            <DocumentTextIcon className="h-5 w-5 mr-2" />
                            Soumettre le rapport de cette semaine
                        </Link>
                    </div>
                </div>

                {/* Mission Cards section */}
                <div className="mt-16 pt-10 border-t w-full space-y-6">
                    <h2 className="text-2xl font-bold text-gray-700">Notre Mission en Action</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Card 1: Partager la Foi */}
                        <div className="group block p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                            <div className="flex flex-col items-center text-center">
                                <PreachIcon className="h-20 w-20 text-blue-700 mb-4 transform group-hover:-translate-y-1 transition-transform duration-300" />
                                <h3 className="text-xl font-semibold text-gray-800">Partager la Foi</h3>
                                <p className="text-gray-600 mt-2 max-w-xs">
                                    Atteindre les âmes pour Christ est au cœur de notre mission. Chaque cellule est une base pour l'évangélisation.
                                </p>
                            </div>
                        </div>

                        {/* Card 2: Grandir Ensemble */}
                        <Link to="/rapport" className="group block p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                             <div className="flex flex-col items-center text-center">
                                <PrayerGroupIcon className="h-20 w-20 text-blue-700 mb-4 transform group-hover:-translate-y-1 transition-transform duration-300" />
                                <h3 className="text-xl font-semibold text-gray-800">Grandir Ensemble</h3>
                                <p className="text-gray-600 mt-2 max-w-xs">
                                   La prière et la communion sont les piliers de nos cellules. Soumettez votre rapport pour participer à cette croissance.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ReportPage: React.FC = () => <ReportForm />;

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    
    const from = location.state?.from?.pathname || "/admin";

    useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err: any) {
            showToast(err.message || "Erreur de connexion.", 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleForgotPassword = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!email) {
            showToast("Veuillez d'abord saisir votre adresse e-mail.", "info");
            return;
        }
        try {
            await api.resetPassword(email);
            // The local API shows an alert, so we can add a toast for better UX consistency
            showToast("La procédure de réinitialisation a été simulée.", "success");
        } catch (err: any) {
            showToast(err.message || "Erreur lors de la réinitialisation.", 'error');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg mt-10">
            <LogoIcon className="h-20 w-20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Connexion</h2>
            <p className="text-gray-600 mb-6 text-center">Accédez à votre tableau de bord.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label htmlFor="password"  className="block text-sm font-medium text-gray-700">Mot de passe</label>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                </div>
                <div className="text-right text-sm">
                    <a href="#" onClick={handleForgotPassword} className="font-medium text-blue-600 hover:text-blue-500">
                        Mot de passe oublié ?
                    </a>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:bg-blue-400 flex justify-center items-center space-x-2 transition-colors">
                    {loading && <SpinnerIcon className="h-5 w-5"/>}
                    <span>{loading ? 'Connexion...' : 'Se connecter'}</span>
                </button>
            </form>
             <p className="text-center text-sm text-gray-600 mt-4">
                Pas encore de compte ? <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">S'inscrire</Link>
            </p>
        </div>
    );
};

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    return <Dashboard user={user!} />;
};


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex justify-center items-center p-20"><SpinnerIcon className="h-16 w-16 text-blue-700"/></div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};


// --- Main App Component ---
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/annonces" element={<PublicPage />} />
                <Route path="/rapport" element={<ReportPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/resources" element={
                  <ProtectedRoute>
                    <ResourcesPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                <Route path="/management" element={
                  <ProtectedRoute>
                    <ManagementPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
            <Footer />
          </div>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;