import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import { type BreadcrumbItem } from '@/types';
import { Input } from "@/components/ui/input";

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/' },
    { title: 'Assign', href: '/assign-baggages' },
];

interface Passenger {
  id: number;
  user_id: number;
  user_name: string;
  flight_number: string;
  destination_code: string;
  passenger_status: string;
}

interface BaggageRecord {
  id: number;
  tag: string;
  type: string;
  weight: number;
  max_weight: number;
  passenger_id: number;
  flight_number: string;
  destination: string;
  status: string;
  check_in_at?: string;
}

export default function Assign() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [assignedBaggages, setAssignedBaggages] = useState<BaggageRecord[]>([]);
  const [selected, setSelected] = useState<Passenger | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [baggageId, setBaggageId] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [tag, setTag] = useState("");
  const [type, setType] = useState("suitcase");
  const [weight, setWeight] = useState<number | undefined>();
  const [maxWeight, setMaxWeight] = useState<number>(20);
  const [checkInAt, setCheckInAt] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("https://n8n.larable.dev/webhook/pms/dashboard/data");
        const data: Passenger[] = await res.json();
        setPassengers(data);

        const baggageRes = await fetch("/baggage/all");
        const baggageData: BaggageRecord[] = await baggageRes.json();
        setAssignedBaggages(baggageData);
        } catch (err) {""};
    };
    fetchData();
  }, []);

  const generateTag = (flightNo: string) =>
    `${flightNo}-${Math.floor(1000 + Math.random() * 9000)}`;

  const formatDateForLaravel = (value: string) =>
    value ? value.replace("T", " ") + ":00" : null;

  const openAssignForm = (p: Passenger) => {
    if (p.passenger_status.toLowerCase() === "cancelled") {
      showToast("❌ Cannot assign baggage to a CANCELLED passenger.");
      return;
    }

    const duplicate = assignedBaggages.some(
      b => b.passenger_id === p.user_id && b.flight_number === p.flight_number
    );
    if (duplicate) {
      showToast("⚠ This passenger already has baggage for this flight.");
      return;
    }

    setIsEditMode(false);
    setSelected(p);
    setTag(generateTag(p.flight_number));
    setType("suitcase");
    setWeight(undefined);
    setMaxWeight(20);
    setCheckInAt(new Date().toISOString().slice(0, 16));
    setShowForm(true);
    setErrors({});
  };

  const openEditForm = async (p: Passenger) => {
    if (p.passenger_status.toLowerCase() === "cancelled") {
      showToast("❌ Cannot edit baggage for a CANCELLED passenger.");
      return;
    }

    setSelected(p);
    try {
      const res = await fetch(`/baggage/by-passenger/${p.user_id}`);
      if (!res.ok) throw new Error("No baggage");

      const data: BaggageRecord = await res.json();
      setIsEditMode(true);
      setBaggageId(data.id);
      setTag(data.tag);
      setType(data.type);
      setWeight(data.weight);
      setMaxWeight(data.max_weight);
      setCheckInAt(
        data.check_in_at ? data.check_in_at.slice(0, 16).replace(" ", "T") : new Date().toISOString().slice(0, 16)
      );
      setShowForm(true);
      setErrors({});
    } catch {
      showToast("No baggage exists to edit. Please assign first.");
    }
  };

const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    setIsSubmitting(true);

    const payload = {
        tag,
        type,
        weight,
        max_weight: maxWeight,
        status: "Checked-in",
        check_in_at: formatDateForLaravel(checkInAt),
    };

    const onFormSuccess = (page: any) => {
        setIsSubmitting(false);
        setErrors({});
        setShowForm(false);

        // Pull the flashed success message from Inertia page props
        const msg = page.props?.success || (isEditMode ? "✅ Baggage updated!" : "✅ Baggage assigned!");
        showToast(msg);

        if (!isEditMode && selected) {
            setAssignedBaggages([
                ...assignedBaggages,
                {
                    id: page.props?.id ?? Math.random(),
                    tag,
                    type,
                    weight: weight ?? 0,
                    max_weight: maxWeight,
                    passenger_id: selected.user_id,
                    flight_number: selected.flight_number,
                    destination: selected.destination_code,
                    status: "Checked-in",
                    check_in_at: formatDateForLaravel(checkInAt) || undefined,
                },
            ]);
        }
    };


    const onFormError = (error: any) => {
        setIsSubmitting(false);

        // Laravel validation errors are in error.response.data.errors
        if (error?.response?.data?.errors) {
            setErrors(error.response.data.errors);
            showToast("❌ Please fix validation errors.");
        } else {
            // Any other network/backend error
            showToast("❌ Failed to submit baggage.");
        }
    };

    if (isEditMode && baggageId) {
        router.post("/baggage/update", { ...payload, id: baggageId }, { onSuccess: onFormSuccess, onError: onFormError });
    } else {
        // Duplicate check before sending
        const duplicate = assignedBaggages.some(
            b => b.passenger_id === selected.user_id && b.flight_number === selected.flight_number
        );
        if (duplicate) {
            setIsSubmitting(false);
            showToast("⚠ This passenger already has baggage for this flight.");
            return;
        }

        router.post("/baggage/store", {
            ...payload,
            passenger_id: selected.user_id,
            flight_number: selected.flight_number,
            destination: selected.destination_code,
        }, { onSuccess: onFormSuccess, onError: onFormError });
    }
};



  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Assign/Edit Baggage" />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl animate-fadeIn z-50 text-center">
          {toastMessage}
        </div>
      )}

      <div className="p-10">
        <h1 className="text-3xl font-bold mb-6">Assign / Edit Baggage</h1>

        <div className="overflow-x-auto shadow-lg rounded-xl bg-white border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#34495e] text-white">
              <tr>
                {["User ID", "Name", "Flight Number", "Destination", "Passenger Status", "Action Buttons"].map(h => (
                  <th key={h} className="px-6 py-4 text-left font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {passengers.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-100">
                  <td className="px-6 py-4">{p.user_id}</td>
                  <td className="px-6 py-4">{p.user_name}</td>
                  <td className="px-6 py-4">{p.flight_number}</td>
                  <td className="px-6 py-4">{p.destination_code}</td>
                  <td className={`px-6 py-4 font-bold ${p.passenger_status.toLowerCase() === "cancelled" ? "text-red-600" : "text-green-700"}`}>
                    {p.passenger_status}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button
                      disabled={p.passenger_status.toLowerCase() === "cancelled"}
                      onClick={() => openAssignForm(p)}
                      className={`px-4 py-2 rounded-lg text-white ${p.passenger_status.toLowerCase() === "cancelled" ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      Assign
                    </button>
                    <button
                      disabled={p.passenger_status.toLowerCase() === "cancelled"}
                      onClick={() => openEditForm(p)}
                      className={`px-4 py-2 rounded-lg text-white ${p.passenger_status.toLowerCase() === "cancelled" ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600"}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showForm && selected && (
          <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
            <div className="w-full max-w-md bg-white p-6 shadow-xl animate-slideLeft">
              <h2 className="text-xl font-bold mb-3">{isEditMode ? "Edit Baggage" : "Assign Baggage"}</h2>
              <form onSubmit={submitForm} className="space-y-4">
                <div>
                  <label className="font-semibold">Tag</label>
                  <Input value={tag} onChange={(e) => setTag(e.target.value)} required />
                  {errors.tag && <p className="text-red-500 text-sm">{errors.tag[0]}</p>}
                </div>
                <div>
                  <label className="font-semibold">Type</label>
                  <select className="w-full border p-2 rounded-lg" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="backpack">Backpack</option>
                    <option value="duffelbag">Duffel Bag</option>
                    <option value="briefcase">Briefcase</option>
                    <option value="suitcase">Suitcase</option>
                  </select>
                  {errors.type && <p className="text-red-500 text-sm">{errors.type[0]}</p>}
                </div>
                <div>
                  <label className="font-semibold">Weight (kg)</label>
                  <Input type="number" value={weight ?? ""} onChange={(e) => setWeight(e.target.value === "" ? undefined : Number(e.target.value))} />
                  {weight && weight > maxWeight && <p className="text-red-500 text-sm">⚠ Weight exceeds maximum!</p>}
                  {errors.weight && <p className="text-red-500 text-sm">{errors.weight[0]}</p>}
                </div>
                <div>
                  <label className="font-semibold">Max Weight (kg)</label>
                  <Input type="number" value={maxWeight} onChange={(e) => setMaxWeight(Number(e.target.value))} />
                  {errors.max_weight && <p className="text-red-500 text-sm">{errors.max_weight[0]}</p>}
                </div>
                <div>
                  <label className="font-semibold">Check-in Date & Time</label>
                  <Input type="datetime-local" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
                  {errors.check_in_at && <p className="text-red-500 text-sm">{errors.check_in_at[0]}</p>}
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-300 rounded-lg">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Assign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slideLeft { animation: slideLeft .3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn .4s ease-out; }
      `}</style>
    </AppLayout>
  );
}
