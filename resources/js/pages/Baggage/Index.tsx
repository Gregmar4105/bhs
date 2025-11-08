import { useState, useCallback, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';

// Assuming you have AppLayout correctly mapped in your project
import AppLayout from '@/layouts/app-layout'; 

// --- LOCAL TYPE DEFINITIONS (To prevent "no exported member" error) ---
interface BreadcrumbItem {
    title: string;
    href: string;
}

interface Baggage {
    id: number;
    tag: string;
    type: string;
    weight: number;
    max_weight: number;
    status: string;
    passenger_id: number;
    flight_number: string;
    destination: string;
}
// ---------------------------------------------------------------------

// --- Status and Styling Logic ---
const statusColor = (status: string) => {
    switch (status) {
        case 'Checked-in': return 'bg-blue-600 text-white shadow-blue-300'; 
        case 'Loaded': return 'bg-yellow-400 text-black shadow-yellow-300'; 
        case 'Unloaded': return 'bg-green-600 text-white shadow-green-300'; 
        case 'Delivered': return 'bg-cyan-700 text-white shadow-cyan-300'; 
        case 'Lost/Delayed': return 'bg-red-700 text-white shaddow-red-00' ;
        case 'Pending': default: return 'bg-gray-500 text-white shadow-gray-300'; 
    }
};

// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
    baggage: Baggage;
    onClose: () => void;
    onConfirm: (id: number, status: string) => void;
    isLoading: boolean;
}

const ConfirmationModal = ({ baggage, onClose, onConfirm, isLoading }: ConfirmationModalProps) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4 p-6 transform transition-all duration-300 scale-110">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-shrink-0">
                        {/* Warning Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Confirm Status Lost or Delayed</h3>
                </div>

                <div className="mb-8 text-gray-900">
                    {/* DETAILS - Now using text-lg for bigger size */}
                    <p className="mb-2 text-gray-800 text-lg">
                        You are about to flag baggage "{baggage.tag}" as Lost/Delayed.
                    </p>
                    <div className="ml-4 space-y-1 text-lg"> {/* Applied text-lg here */}
                        <p className="font-medium">
                            Flight: {baggage.flight_number}
                        </p>
                        <p className="font-medium">
                            PassengerID: {baggage.passenger_id}
                        </p>
                    </div>
                    
                    {/* FINAL WARNING - Added mt-2 (8px margin) and kept text-sm */}
                    <p className="text-sm **mt-2** border-t pt-2 text-gray-500" style={{ marginTop: '5px' }}>
                        This is an irreversible action that initiates a formal investigation and prevents further operational steps.
                    </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150 flex items-center justify-center disabled:opacity-50"
                        // When confirmed, update the status to 'Lost/Delayed'
                        onClick={() => onConfirm(baggage.id, 'Lost/Delayed')}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                Flagging... <LoadingSpinner />
                            </>
                        ) : (
                            'Confirm Lost/Delayed'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LoadingSpinner = () => (
    <svg className="animate-spin h-4 w-4 text-white inline ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


interface Props {
    baggages: Baggage[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/' },
    { title: 'BHS Operations', href: '/baggages' }, 
];

// --- Baggage List Component ---
export default function BaggageIndex({ baggages: initialBaggages }: Props) {
    const [baggages, setBaggages] = useState<Baggage[]>(initialBaggages);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [baggageToConfirm, setBaggageToConfirm] = useState<Baggage | null>(null); // State to hold baggage for modal confirmation
 
    
    // Sync state when new props are received from the server reload
    useEffect(() => {
        setBaggages(initialBaggages);
    }, [initialBaggages]);


    /**
     * Updates the baggage status via an Inertia POST request.
     */
    const updateStatus = useCallback((id: number, status: string) => {
        if (processingId === id) return; 

        setProcessingId(id);
        setBaggageToConfirm(null); // Close modal if open
        
        const url = `/baggages/${id}`; 

        router.post(
            url, 
            { status: status }, 
            {
                // We keep preserveScroll: true on the POST request to maintain scroll position
                preserveScroll: true, 
                
                // When the request finishes (success or error)
                onFinish: () => {
                    setProcessingId(null);
                    // Force a reload to sync the UI with the final database state.
                    // The invalid 'preserveScroll' has been removed here.
                    router.reload(
                        { only: ['baggages'] } 
                    );
                },
                onError: (errors) => {
                    setProcessingId(null);
                    console.error("Failed to update status:", errors);
                    // The server's error handler (in the controller) should return a flash message 
                    // which Inertia will handle and display.
                }
            }
        );
    }, [processingId]);

    /**
     * Opens the confirmation modal when 'Lost/Delayed' is clicked.
     */
    const handleLostDelayedClick = useCallback((baggage: Baggage) => {
        setBaggageToConfirm(baggage);
    }, []);

    // Helper component to render a single baggage card
    const BaggageCard = ({ b }: { b: Baggage }) => {
        const [imageError, setImageError] = useState(false);
        const isLoading = processingId === b.id;
        
        const actions = [
            { status: 'Pending', target: 'Checked-in', label: 'Check-in (PMS)', color: 'bg-indigo-600 hover:bg-indigo-700' },
            { status: 'Checked-in', target: 'Loaded', label: 'Load', color: 'bg-yellow-400 hover:bg-yellow-500 text-black' },
            { status: 'Loaded', target: 'Unloaded', label: 'Unload', color: 'bg-green-600 hover:bg-green-700' },
            { status: 'Unloaded', target: 'Delivered', label: 'Deliver', color: 'bg-cyan-700 hover:bg-cyan-800' },
        ];

        const nextAction = actions.find(a => a.status === b.status);

        return (
            <div 
                key={b.id} 
                className={`flex flex-col bg-white shadow-xl rounded-xl overflow-hidden transition-all duration-300 transform hover:scale-[1.02] ${isLoading ? 'opacity-75' : ''}`}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4 border-b pb-7">
                        <div className="text-sm">
                            <p className="text-gray-500 font-medium">TAG:</p>
                            <p className="font-extrabold text-3xl text-gray-800">{b.tag}</p>
                        </div>
                        
                        {/* Image or Placeholder with Fallback */}
                        <div className="w-20 h-20 flex-shrink-0 rounded-full bg-gray-50 flex items-center justify-center border-2 border-gray-100">
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

                    <div className="space-y-3 mb-5 text-m">
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-500">TYPE:</span> {b.type.toUpperCase()}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-500">FLIGHT:</span> {b.flight_number} / {b.destination}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-500">PASSENGER:</span> #{b.passenger_id}
                        </p>
                    </div>

                    <div className="mb-4 flex items-center justify-between border-t pt-4">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">WEIGHT</p>
                            <p className="font-bold text-lg text-gray-800">{b.weight} / {b.max_weight} KG</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm mb-1 text-center">STATUS</p>
                            <span 
                                className={`inline-block px-4 py-1 text-sm font-bold rounded-full shadow-md ${statusColor(b.status)}`}
                            >
                                {b.status} {isLoading && <LoadingSpinner />}
                            </span>
                        </div>
                    </div>

    
                    <div className="h-10 flex items-center">
                        {b.weight > b.max_weight && (
                            <div className="bg-red-100 border-l-4 border-red-500 p-2 text-red-700 text-xs font-semibold rounded w-full">
                                ⚠ OVERWEIGHT : Exceeds max weight.
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions (Buttons) at the bottom */}
                <div className="p-5 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-2">
                    {b.status === 'Delivered' ? (
                        <p className="w-full text-center text-sm text-gray-500 font-medium">Delivered Successfuly</p>
                    ) : b.status === 'Lost/Delayed' ? (
                         <div className='w-full text-center'>
                             <span className='inline-block px-4 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-lg'>
                                Status: Lost/Delayed - Requires Investigation
                            </span>
                        </div>
                    ) : (
                        // If the baggage is NOT delivered and NOT already lost/delayed, show both buttons
                        <>
                            {/* Primary next action button */}
                            {nextAction && (
                                <button
                                    className={`flex-1 min-w-0 px-3 py-2 text-sm font-medium ${nextAction.color} text-white rounded-lg transition disabled:opacity-50`}
                                    disabled={isLoading}
                                    onClick={() => updateStatus(b.id, nextAction.target)}
                                >
                                    {isLoading ? `${nextAction.label}...` : nextAction.label}
                                </button>
                            )}
                            
                            {/* Secondary Lost/Delayed button - Triggers Modal */}
                            <button
                                className={`flex-1 min-w-0 px-3 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 ${!nextAction ? 'w-full' : ''}`}
                                disabled={isLoading}
                                onClick={() => handleLostDelayedClick(b)} // Now calls the modal handler
                            >
                                {isLoading ? 'Requesting Confirmation...' : 'Lost/Delayed'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Baggages" />
            <div className="w-5/5 mx-auto p-10">
                <h1 className="text-3xl font-extrabold text-white-900">Baggage Handling System (BHS) Operations</h1>
                <p className="text-white-600 mb-8">
                    {/* Click the next logical button to transition the item's operational status. */}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {baggages.length > 0 ? (
                        baggages.map(baggage => <BaggageCard b={baggage} key={baggage.id} />)
                    ) : (
                        <div className="md:col-span-3 text-center py-12 bg-white rounded-xl shadow-lg">
                            <p className="text-xl font-medium text-gray-500">No baggage items found.</p>
                        </div>
                    )}
                </div>  
            </div>
            
            {/* Render Confirmation Modal if state is set */}
            {baggageToConfirm && (
                <ConfirmationModal 
                    baggage={baggageToConfirm}
                    onClose={() => setBaggageToConfirm(null)}
                    onConfirm={updateStatus} // updateStatus handles the API call and closes the modal (by clearing baggageToConfirm)
                    isLoading={!!processingId}
                />
            )}
        </AppLayout>
    );
}
