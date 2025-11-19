


import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Input } from "@/components/ui/input";

// --- Types ---
interface Flight {
    id?: number;
    user_id?: number;
    flight_number?: string;
    airline_code?: string;
    origin_code?: string;
    destination_code?: string;
    aircraft_icao_code?: string;
    gate_code?: string;
    baggage_code?: string;
    scheduled_departure_time?: string;
    scheduled_arrival_time?: string;
    status_code?: string;
    passenger_status?: string | null;
}

interface FlightState {
    flights: Flight[];
    last_updated: string;
}

const POLLING_INTERVAL = 10000;
const apiUrl = 'https://n8n.larable.dev/webhook/real/pms-datas';

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/' },
    { title: 'Connecting Flights', href: '/connecting-flights' },
];

// ---- STATUS COLORS ----
const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-200 text-gray-700";
    const code = status.split("-")[1];
    switch (code) {
        case "SCH": return "bg-blue-100 text-blue-700";
        case "DEP": return "bg-yellow-100 text-yellow-700";
        case "ARR": return "bg-green-100 text-green-800";
        case "CNL": return "bg-red-100 text-red-700";
        default: return "bg-gray-200 text-gray-700";
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
const fetchWithRetry = async (url: string, retries = 3): Promise<FlightState> => {
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
            let flights = data.filter(item => item.flight_number);
            // Remove duplicates based on flight_number
            const seen = new Set();
            flights = flights.filter(f => {
                if (seen.has(f.flight_number)) return false;
                seen.add(f.flight_number);
                return true;
            });
            flights = flights.map((f, index) => ({
                ...f,
                passenger_status: passengerStatuses[index] ?? null,
            }));

            return { flights, last_updated: new Date().toLocaleString() };
        } catch (err) {
            lastError = err as Error;
            if (i < retries - 1) await new Promise((r) => setTimeout(r, 2 ** i * 1000));
        }
    }
    throw lastError;
};

// --- Sort flights by departure then flight number ---
// --- Sort flights by departure then flight number ---
const sortFlights = (flights: Flight[]) =>
    [...flights].sort((a, b) => {
        const timeA = a.scheduled_departure_time;
        const timeB = b.scheduled_departure_time;

        const t1 = timeA ? new Date(timeA).getTime() : Infinity;
        const t2 = timeB ? new Date(timeB).getTime() : Infinity;

        // 1. Sort by Scheduled Departure Time (Ascending: Earlier times first)
        // By assigning 'Infinity' to missing/invalid times, they are naturally pushed to the end.
        if (t1 !== t2) {
            // Note: If t1 or t2 is NaN, the comparison t1 - t2 results in NaN, which is treated as 0 (no change) in some sort implementations.
            // Explicitly handle invalid dates by checking if they are valid numbers.
            const validT1 = !isNaN(t1);
            const validT2 = !isNaN(t2);

            if (validT1 && validT2) return t1 - t2; // Ascending sort for valid times
            if (!validT1 && validT2) return 1; // a comes last
            if (validT1 && !validT2) return -1; // a comes first
            return 0; // Both invalid, sort order doesn't matter for time
        }
        
        // 2. Secondary sort by Flight Number (Ascending)
        return (a.flight_number || "").localeCompare(b.flight_number || "", undefined, { numeric: true });
    });

export default function ConnectingFlight() {
    const [data, setData] = useState<FlightState>({ flights: [], last_updated: 'Never' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(POLLING_INTERVAL / 1000);
    const [lastFlights, setLastFlights] = useState<Flight[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchFlights = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedData = await fetchWithRetry(apiUrl);
            setLastFlights(data.flights);
            setData({ ...fetchedData, flights: sortFlights(fetchedData.flights) });
            setCountdown(POLLING_INTERVAL / 1000);
        } catch (e: any) {
            setError(`Unable to fetch from API: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlights();
        const poll = setInterval(fetchFlights, POLLING_INTERVAL);
        return () => clearInterval(poll);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(s => (s <= 1 ? POLLING_INTERVAL / 1000 : s - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const hasChanged = (prev: Flight | undefined, curr: Flight) => {
        if (!prev) return true;
        return (
            prev.id !== curr.id ||
            prev.user_id !== curr.user_id ||
            prev.flight_number !== curr.flight_number ||
            prev.airline_code !== curr.airline_code ||
            prev.scheduled_departure_time !== curr.scheduled_departure_time ||
            prev.scheduled_arrival_time !== curr.scheduled_arrival_time ||
            prev.status_code !== curr.status_code ||
            prev.baggage_code !== curr.baggage_code ||
            prev.passenger_status !== curr.passenger_status
        );
    };

    const filteredFlights = useMemo(() => {
        const term = searchTerm.toLowerCase();
        // THIS IS THE SEARCH FILTER INCLUDE SOME VARIABLES YOU WANT TO SEARCH FOR
        return sortFlights(
            data.flights.filter(f => {
                // Text search fields
                const matchText =
                    f.flight_number?.toLowerCase().includes(term) ||
                    f.origin_code?.toLowerCase().includes(term) ||
                    f.destination_code?.toLowerCase().includes(term) ||
                    f.gate_code?.toLowerCase().includes(term) ||
                    f.status_code?.toLowerCase().includes(term) ||
                    f.baggage_code?.toLowerCase().includes(term) ||
                    f.passenger_status?.toLowerCase().includes(term);

                // Time search (partial string match, no lowercase needed)
                const matchTime =
                    f.scheduled_departure_time?.includes(term) ||
                    f.scheduled_arrival_time?.includes(term) ||
                    f.baggage_code?.includes(term);

                return matchText || matchTime;
            })
        );
    }, [data.flights, searchTerm]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Connecting Flights" />
            <div className="flex flex-col gap-6 p-4 md:p-10 bg-white min-h-screen rounded-xl shadow-2xl">

                {/* Header & Countdown */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4">
                    <div className="mb-4 md:mb-0">
                        <h1 className="text-3xl font-extrabold text-gray tracking-tight">
                            Baggages Transfer Monitor
                        </h1>
                        <p className="text-lg text-gray-600 mt-1">
                            Real-time tracking of connecting flight details.
                        </p>
                    </div>


                    {/* Search Bar */}
                    <div className="mb-6">
                        <Input
                            placeholder="Search flights..."
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
                                    'ID', 'User ID','Flight Number', 'Airline', 'Origin', 'Destination',
                                    'ICAO', 'Gate Code', 'Baggage Code',
                                    'Departure', 'Arrival', 
                                    // 'Status Code', 
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
                                        No flights match your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredFlights.map(flight => {
                                    const prev = lastFlights.find(f => f.flight_number === flight.flight_number);
                                    const changed = hasChanged(prev, flight);
                                    return (
                                        <tr key={flight.flight_number} className={`transition-all duration-1000 ${changed ? 'animate-pop' : 'hover:bg-blue-50/50'}`}>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{highlightText(flight.id?.toString(), searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.user_id?.toString(), searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.flight_number, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.airline_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.origin_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.destination_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.aircraft_icao_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.gate_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.baggage_code, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.scheduled_departure_time, searchTerm)}</td>
                                            <td className="px-6 py-4 text-sm">{highlightText(flight.scheduled_arrival_time, searchTerm)}</td>
                                            {/* <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(flight.status_code)}`}>
                                                    {highlightText(flight.status_code, searchTerm)}
                                                </span>
                                            </td> */}
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

