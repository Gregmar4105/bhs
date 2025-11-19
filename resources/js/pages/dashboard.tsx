
// -------------------------------------------------------------------------------------------------------------------------------


import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Input } from "@/components/ui/input";

// --- Types ---
interface Passenger {
  id: number;
  user_id: number;
  user_name: string;
  flight_number: string;
  destination_code: string;
  baggage_code: string;
  passenger_status: string;
  created_at: string;
  updated_at: string;
}

interface DashboardState {
  passengers: Passenger[];
  last_updated: string;
}

const POLLING_INTERVAL = 10000;
const apiUrl = 'https://n8n.larable.dev/webhook/pms/dashboard/data';

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/' },
    { title: 'Connecting Flights', href: '/connecting-flights' },
];


// ---- STATUS COLORS ----
const statusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'DELAYED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 ring-red-500/10';
    case 'CHECKED-IN':
    case 'CHECKED-OUT':
    case 'PENDING':
      return 'bg-blue-100 text-blue-800 ring-blue-500/10';
    case 'LOADED':
      return 'bg-yellow-100 text-yellow-800 ring-yellow-500/10';
    case 'UNLOADED':
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 ring-green-500/10';
    default:
      return 'bg-gray-100 text-gray-800 ring-gray-500/10';
  }
};


const getPassengerStatusColor = (status: string | undefined | null) => {
    if (!status) return "bg-gray-100 text-gray-600";
    switch (status.toLowerCase()) {
        case "checked-in": return "bg-green-100 text-green-800";
        case "boarding": return "bg-blue-100 text-blue-700";
        case "no-show": return "bg-orange-100 text-orange-700";
        case "cancelled": return "bg-red-100 text-red-700";
        default: return "bg-gray-100 text-gray-600";
    }
};

// --- Highlight matching search term ---
const highlightText = (text: string | undefined, term: string) => {
    if (!text || !term) return text;
    const regex = new RegExp(`(${term})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <span key={i} className="bg-yellow-200">{part}</span> : part
    );
};

// --- Fetch flights ---
const fetchWithRetry = async (url: string, retries = 3): Promise<DashboardState> => {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                const body = await response.text();
                throw new Error(`HTTP ${response.status}: ${body.slice(0, 100)}...`);
            }
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("Invalid API schema");

            // Extract passenger statuses
            const passengerStatuses: string[] = data.filter(item => item.passenger_status).map(item => item.passenger_status);
            let passengers = data.filter(item => item.flight_number);
            // Remove duplicates based on flight_number
            const seen = new Set();
            passengers = passengers.filter(f => {
                if (seen.has(f.flight_number)) return false;
                seen.add(f.flight_number);
                return true;
            });
            passengers = passengers.map((f, index) => ({
                ...f,
                passenger_status: passengerStatuses[index] ?? null,
            }));

            return { passengers, last_updated: new Date().toLocaleString() };
        } catch (err) {
            lastError = err as Error;
            if (i < retries - 1) await new Promise((r) => setTimeout(r, 2 ** i * 1000));
        }
    }
    throw lastError;
};

// --- Sort flights by departure then flight number ---
const sortPassengers = (passengers: Passenger[]) =>
    [...passengers].sort((a, b) => {
        const t1 = new Date(a.updated_at || "").getTime();
        const t2 = new Date(b.updated_at|| "").getTime();
        if (t1 !== t2) return t1 - t2;
        return (a.flight_number || "").localeCompare(b.flight_number || "", undefined, { numeric: true });
    });

export default function Dashboard() {
    const [data, setData] = useState<DashboardState>({ passengers: [], last_updated: 'Never' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(POLLING_INTERVAL / 1000);
    const [lastFlights, setLastPassengers] = useState<Passenger[]>([]);
    const [searchTerm, setSearchTerm] = useState("");


    const fetchPassengers = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedData = await fetchWithRetry(apiUrl);
            setLastPassengers(data.passengers);
            setData({ ...fetchedData, passengers: sortPassengers(fetchedData.passengers) });
            setCountdown(POLLING_INTERVAL / 1000);
        } catch (e: any) {
            setError(`Unable to fetch from API: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPassengers();
        const poll = setInterval(fetchPassengers, POLLING_INTERVAL);
        return () => clearInterval(poll);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(s => (s <= 1 ? POLLING_INTERVAL / 1000 : s - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const hasChanged = (prev: Passenger | undefined, curr: Passenger) => {
        if (!prev) return true;
        return (
            prev.id !== curr.id ||
            prev.user_id !== curr.user_id ||
            prev.user_name !== curr.user_name ||
            prev.flight_number !== curr.flight_number ||
            prev.baggage_code !== curr.baggage_code ||
            prev.passenger_status !== curr.passenger_status
        );
    };

    const filteredFlights = useMemo(() => {
        const term = searchTerm.toLowerCase();
        // THIS IS THE SEARCH FILTER INCLUDE SOME VARIABLES YOU WANT TO SEARCH FOR
        return sortPassengers(
            data.passengers.filter(f => {
                // Text search fields
                const matchText =
                    f.flight_number?.toLowerCase().includes(term) ||
                    f.destination_code?.toLowerCase().includes(term) ||
                    f.user_name?.toLowerCase().includes(term) ||
                    f.baggage_code?.toLowerCase().includes(term) ||
                    f.passenger_status?.toLowerCase().includes(term);

                // Time search (partial string match, no lowercase needed)
                const matchTime =
                    f.updated_at?.includes(term) ||
                    f.updated_at?.includes(term) ||
                    f.baggage_code?.includes(term);

                return matchText || matchTime;
            })
        );
    }, [data.passengers, searchTerm]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Connecting Flights" />
            <div className="flex flex-col gap-6 p-4 md:p-10 bg-white min-h-screen rounded-xl shadow-2xl">

                {/* Header & Countdown */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4">
                    <div className="mb-4 md:mb-0">
                        <h1 className="text-3xl font-extrabold text-gray tracking-tight">
                            Passenger Monitoring 
                        </h1>
                        <p className="text-lg text-gray-600 mt-1">
                            Real-time tracking of baggage status of passengers.
                        </p>
                    </div>


                    {/* Search Bar */}
                    <div className="mb-6">
                        <Input
                            placeholder="Search passengers..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-md"
                        />
                    </div>


                    <div className="flex items-center space-x-4">
                        <p className="text-sm text-gray-700 font-medium hidden sm:block">
                            Last Sync: <span className="font-bold text-gray-900">{data.last_updated}</span>
                        </p>
                        <div className={`text-sm font-bold px-4 py-2 rounded-full shadow-lg min-w-[150px] text-center transition-colors duration-500 ${countdown <= 3 ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : 'bg-green-100 text-green-700 ring-2 ring-green-100'}`}>
                            {loading ? 'RECEIVING DATA…' : `Next Update in: ${countdown}s`}
                        </div>
                    </div>
                    
                </div>


                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-[#34495e] text-white">
                            <tr>
                                {[
                                    'User ID',
                                    'User Name',
                                    'Flight Number', 
                                    'Airline', 
                                    'Baggage Code',
                                    'Passenger Status'
                                ].map(h => (
                                    <th key={h} className="px-6 py-4 text-left text-xs md:text-sm font-semibold uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading && filteredFlights.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-20 text-center text-gray-400 text-xl font-medium animate-pulse">
                                        Retrieving data... Please wait.
                                    </td>
                                </tr>
                            ) : filteredFlights.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-12 text-center text-gray-500 text-lg font-medium">
                                        No passengers match your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredFlights.map(flight => {
                                    const prev = lastFlights.find(f => f.flight_number === flight.flight_number);
                                    const changed = hasChanged(prev, flight);
                                    return (
                                        <tr key={flight.flight_number} className={`transition-all duration-1000 ${changed ? 'animate-pop' : 'hover:bg-blue-50/50'}`}>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{highlightText(flight.user_id?.toString(), searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.user_name, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.flight_number, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.destination_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.baggage_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPassengerStatusColor(flight.passenger_status)}`}>
                                                    {highlightText(flight.passenger_status ?? "N/A", searchTerm)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                @keyframes popIn {
                    0% { background-color: rgba(70, 140, 253, 0.2); }
                    50% { background-color: rgba(70, 140, 253, 0.4); }
                    100% { background-color: transparent; }
                }
                .animate-pop {
                    animation: popIn 1s ease-out;
                }
            `}</style>
        </AppLayout>
    );
}

