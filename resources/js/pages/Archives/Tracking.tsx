import { useState, useCallback, useMemo, useEffect } from 'react';

// --- MOCK DEPENDENCIES FOR SANDBOX COMPATIBILITY ---

// 1. Mock the BreadcrumbItem type (originally from '@/types')
type BreadcrumbItem = {
    title: string;
    href: string;
};

// 2. Mock the AppLayout component (originally from '@/layouts/app-layout')
// We create a minimal version to allow the component to render its children.
const AppLayout = ({ children, breadcrumbs }: { children: React.ReactNode, breadcrumbs: BreadcrumbItem[] }) => {
    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 font-sans">
            <header className="bg-white shadow-lg rounded-xl p-4 mb-6">
                <div className="flex space-x-2 text-sm text-gray-500">
                    {/* Simplified Breadcrumbs for mock */}
                    {breadcrumbs.map((item, index) => (
                        <span key={index}>
                            <a href={item.href} className="text-blue-500 hover:text-blue-700 font-medium">{item.title}</a>
                            {index < breadcrumbs.length - 1 && <span className="mx-1">/</span>}
                        </span>
                    ))}
                </div>
            </header>
            <main>
                {children}
            </main>
        </div>
    );
};

// 3. Mock Inertia dependencies (originally from '@inertiajs/react')
const Head = ({ title }: { title: string }) => <title>{title}</title>;

const router = {
    // Mock the post method to simulate API calls
    post: (url: string, data: any, options: { onStart?: () => void, onFinish?: () => void, onError?: (errors: any) => void, preserveScroll?: boolean }) => {
        options.onStart?.();
        console.log(`MOCK ROUTER: POST request initiated to ${url} with status: ${data.status}`);
        
        // Simulate network delay and success
        setTimeout(() => {
            console.log(`MOCK ROUTER: POST request completed for ${url}`);
            options.onFinish?.();
        }, 800);
    },
    // Mock the reload method
    reload: (options: { only: string[], preserveScroll: boolean }) => {
        console.log(`MOCK ROUTER: Reload triggered for props: ${options.only.join(', ')}`);
    }
};

// --- END MOCK DEPENDENCIES ---

// Extend the interface with necessary tracking fields from the Baggages model
interface Baggage {
    id: number;
    tag: string;
    type: string;
    weight: number;
    max_weight: number;
    status: string;
    passenger_id: number;     // New: Passenger identifier
    flight_number: string;    // New: Flight number
    destination: string;      // New: Destination airport/city
}

interface Props {
    baggages: Baggage[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Baggage Tracking',
        href: '/baggages', 
    },
];

// --- Status and Styling Logic ---
const statusColor = (status: string) => {
    switch (status) {
        case 'Checked-in':
            return 'bg-blue-600 text-white'; 
        case 'Loaded':
            return 'bg-yellow-400 text-black'; 
        case 'Unloaded':
            return 'bg-green-600 text-white'; 
        case 'Delivered':
            return 'bg-cyan-700 text-white'; // Updated color for final status
        case 'Pending':
        default:
            return 'bg-gray-500 text-white'; 
    }
};

// --- Baggage Page Component ---
// FIX: Added default value of [] to initialBaggages to prevent TypeError if prop is undefined/null
export default function BaggageDetails({ baggages: initialBaggages = [] }: Props) {
    // Keep local state for responsive UI (optimistic updates/loading states)
    const [baggages, setBaggages] = useState<Baggage[]>(initialBaggages);
    // New state to track which baggage item is currently processing an update
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Synchronize local state when new props arrive from the server
    // FIX: Replaced useMemo with useEffect for state synchronization to prevent infinite re-renders.
    useEffect(() => {
        setBaggages(initialBaggages);
    }, [initialBaggages]);


    /**
     * Updates the baggage status via an Inertia POST request.
     */
    const updateStatus = useCallback((id: number, status: string) => {
        if (processingId === id) return; // Prevent double-click

        setProcessingId(id); // Start loading state for this card
        
        const url = `/baggages/${id}`; 

        router.post(
            url, 
            { status: status }, 
            {
                // Optimistic UI update before the request is sent
                onStart: () => {
                    setBaggages(prev =>
                        prev.map(b => (b.id === id ? { ...b, status } : b))
                    );
                },
                preserveScroll: true, 
                // When the request finishes (success or error)
                onFinish: () => {
                    setProcessingId(null); // Stop loading state
                    // We rely on Inertia to refresh the props if the server returns them, 
                    // or force a refresh to sync with the database after the POST.
                    router.reload({ only: ['baggages'], preserveScroll: true });
                },
                onError: (errors) => {
                    console.error("Failed to update status:", errors);
                    // A proper implementation might revert the state here if the error is critical.
                    // For now, we rely on the router.reload in onFinish to fix the state.
                }
            }
        );
    }, [processingId]);

    // Helper component to render a single baggage card
    const BaggageCard = ({ b }: { b: Baggage }) => {
        const [imageError, setImageError] = useState(false);
        const isLoading = processingId === b.id;
        
        // Dynamic content for the action buttons
        const actions = [
            { status: 'Pending', target: 'Checked-in', label: 'Check-in (PMS)', color: 'bg-cyan-600 hover:bg-cyan-700' },
            { status: 'Checked-in', target: 'Loaded', label: 'Load', color: 'bg-yellow-400 hover:bg-yellow-500 text-black' },
            { status: 'Loaded', target: 'Unloaded', label: 'Unload', color: 'bg-green-600 hover:bg-green-700' },
            { status: 'Unloaded', target: 'Delivered', label: 'Deliver', color: 'bg-gray-600 hover:bg-gray-700' },
        ];

        return (
            <div 
                key={b.id} 
                className={`flex flex-col bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${isLoading ? 'opacity-75' : ''}`}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4 border-b pb-3">
                        <div className="text-sm">
                            <p className="text-gray-500">TAG:</p>
                            <p className="font-extrabold text-2xl text-gray-800">{b.tag}</p>
                        </div>
                        {/* Image or Placeholder with Fallback */}
                        <div className="w-20 h-20 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                            {imageError ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4M4 11l8 4 8-4M4 15l8 4 8-4" />
                                </svg>
                            ) : (
                                <img 
                                    src={`/pics/${b.type.toLowerCase()}.png`} 
                                    alt={b.type} 
                                    className="w-full h-full object-contain p-2"
                                    onError={() => setImageError(true)} // Set fallback on error
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 mb-5 text-sm">
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-500">TYPE:</span> {b.type.toUpperCase()}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-500">FLIGHT:</span> {b.flight_number} - {b.destination}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-500">PASSENGER ID:</span> {b.passenger_id}
                        </p>
                    </div>

                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">WEIGHT:</p>
                            <p className="font-bold text-lg text-gray-800">{b.weight} KG</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm mb-1">CURRENT STATUS:</p>
                            <span 
                                className={`inline-block px-4 py-1 text-sm font-bold rounded-full shadow-md ${statusColor(b.status)}`}
                            >
                                {b.status} {isLoading && '...'}
                            </span>
                        </div>
                    </div>

                    {b.weight > b.max_weight && (
                        <div className="bg-red-100 border-l-4 border-red-500 p-2 text-red-700 text-xs font-semibold mt-3 rounded">
                            ⚠ OVERWEIGHT: Exceeds max weight of {b.max_weight} KG.
                        </div>
                    )}
                </div>

                {/* Actions (Buttons) at the bottom */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-2">
                    {actions.map(action => {
                        const isPrimaryAction = action.status === b.status;
                        
                        // Render only the next logical step
                        if (b.status === 'Delivered' || (action.status !== 'Pending' && action.status !== b.status) ) {
                            return null;
                        }
                        
                        // Special handling for the Check-in button (which is active when status is 'Pending')
                        if (action.status === 'Pending' && b.status !== 'Pending') {
                            return null;
                        }

                        return (
                            <button
                                key={action.target}
                                className={`flex-1 min-w-0 px-3 py-2 text-sm font-medium ${action.color} text-white rounded-lg transition disabled:opacity-50`}
                                disabled={!isPrimaryAction || isLoading}
                                onClick={() => updateStatus(b.id, action.target)}
                            >
                                {isLoading && isPrimaryAction ? 'Processing...' : action.label}
                            </button>
                        );
                    })}
                    {b.status === 'Delivered' && (
                        <p className="w-full text-center text-sm text-gray-500 font-medium">Baggage cycle complete.</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Baggage Tracking" />
            <div className="py-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Live Baggage Tracking</h1>
                
                {baggages.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-lg">
                         <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m4 4v10m8-10v10" />
                        </svg>
                        <p className="mt-2 text-lg font-medium text-gray-900">No Baggage Found</p>
                        <p className="mt-1 text-sm text-gray-500">The tracking system is currently clear.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {baggages.map(b => (
                            <BaggageCard key={b.id} b={b} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
