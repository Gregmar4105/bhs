import React, { useState, useEffect } from 'react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

// Define the shape of the flight data (matching the JSON output from your n8n workflow)
interface Flight {
    flight_number: string;
    airline: string;
    transfer_time: string;
    state: string;
}

// Define the shape of the component's state
interface FlightState {
    flights: Flight[];
    last_updated: string;
}

// Polling interval in miliseconds (30seconds)
const POLLING_INTERVAL= 10000;

// Helper function to handle fetch retry logic and exponential backoff
const fetchWithRetry = async (url: string, retries = 3): Promise<FlightState> => {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                // Read response text for better debugging if HTTP status is bad
                const responseText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}. Response body (if available): ${responseText.substring(0, 100)}...`);
            }

            const data = await response.json();

            // Crucial defensive check against incomplete n8n response structures
            if (!data.flights || !Array.isArray(data.flights)) {
                throw new Error("Invalid data format received from API: 'flights' array missing.");
            }

            return data as FlightState;

        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${i + 1} failed:`, lastError.message);
            if (i < retries - 1) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    throw lastError;
};

// Breadcrumbs definition using the imported BreadcrumbItem type
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/',
    },
    {
        title: 'Connecting Flights',
        href: '/connecting-flights',
    },
];

export default function Dashboard() {
    const [data, setData] = useState<FlightState>({ flights: [], last_updated: 'Never' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(POLLING_INTERVAL / 1000); // Start at 30 seconds

    // *****************************************************************************************
    // ⚠️ IMPORTANT: Replace the placeholder below with your active n8n PRODUCTION Webhook URL.
    // Ensure the URL looks like: https://your.n8n.instance/webhook/long-random-string
    // *****************************************************************************************
    const apiUrl = 'https://n8n.larable.dev/webhook/connecting-flights';
    // *****************************************************************************************

    const fetchFlights = async () => {
        if (apiUrl.includes('https://n8n.larable.dev/webhook-test/connecting-flights')) {
             setError("Placeholder API URL detected. Please update 'apiUrl' with your active n8n Production Webhook URL.");
             setLoading(false);
             return;
        }

        setLoading(true);
        setError(null);
        try {
            const fetchedData = await fetchWithRetry(apiUrl);
            setData(fetchedData);
            setCountdown(POLLING_INTERVAL / 1000); // Reset countdown on successful fetch
        } catch (err) {
            setError(`Failed to fetch data from API. Please check your n8n workflow URL and status: ${apiUrl}`);
            console.error("Full Fetch Error:", err);
            // Don't reset countdown on error, let it retry on next interval
        } finally {
            // Set loading back to false only when the data fetching is truly done.
            // We keep the countdown running independently.
            setLoading(false);
        }
    };

   // Effect 1: Handles the initial fetch and the polling interval
    useEffect(() => {
        fetchFlights(); // Initial fetch

        const intervalId = setInterval(fetchFlights, POLLING_INTERVAL); // Poll every 30 seconds

        // Cleanup function
        return () => clearInterval(intervalId);
    }, []);

    // Effect 2: Handles the countdown timer display
    useEffect(() => {
        // Decrement the countdown every second
        const timerId = setInterval(() => {
            setCountdown(prevCountdown => {
                if (prevCountdown <= 1) {
                    // This will be reset by fetchFlights on successful fetch, 
                    // or naturally wrap back up as the fetch starts.
                    return POLLING_INTERVAL / 1000; 
                }
                return prevCountdown - 1;
            });
        }, 1000);

        // Cleanup function
        return () => clearInterval(timerId);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Connecting Flights" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-10">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                    Connecting Flight Transfer Monitor
                </h1>

                <div className="flex items-center justify-between mb-6 border-b pb-4 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Real-time monitoring of baggage requiring transfer to subsequent flights.
                        <span className="font-semibold ml-2 text-gray-800 dark:text-gray-200">Last Sync: {data.last_updated}</span>
                    </p>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full shadow-md transition-colors duration-500 
                            ${countdown <= 5 ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                        {loading ? 'SYNCING...' : `Next Update in: ${countdown}s`}
                    </div>
                </div>

                {/* Loading State / Error State */}
                {(loading && data.flights.length === 0 && !error) && (
                    <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-xl text-center shadow-lg">
                        <svg className="animate-spin h-5 w-5 mr-3 text-blue-500 inline-block" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Fetching real-time FIS data...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-600 p-4 rounded-xl text-white shadow-xl mb-6">
                        <p className="font-bold text-lg">Data Fetch Error!</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                )}

                {/* Data Table */}
                <div className="overflow-x-auto shadow-xl rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-[#34495e] text-white">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-xl">
                                    Flight Number
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Airline
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Transfer Time
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-xl">
                                    Baggage Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {data.flights.length > 0 ? (
                                data.flights.map((flight) => {
                                    const stateColor =
                                        flight.state === 'Held/Delayed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                        flight.state === 'Misrouted' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';

                                    return (
                                        <tr key={flight.flight_number} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {flight.flight_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {flight.airline}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                <span className="text-gray-900 dark:text-white">{flight.transfer_time}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stateColor}`}>
                                                    {flight.state}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                !loading && !error && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 whitespace-nowrap text-center text-gray-500 dark:text-gray-400 text-lg">
                                            No connecting flights currently requiring transfer.
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}