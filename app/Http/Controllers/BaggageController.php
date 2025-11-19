<?php

namespace App\Http\Controllers;

use App\Models\Baggages;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BaggageController extends Controller
{
    //
    public function store(Request $request)
    {
        // 1. Validation
        $data = $request->validate([
            'passenger_id' => 'required|integer',
            'flight_number' => [
                'required',
                'string',
                Rule::unique('baggages')->where(fn ($query) => $query->where('passenger_id', $request->passenger_id)),
            ],
            'destination' => 'required|string',
            'tag' => 'required|string|unique:baggages,tag',
            'type' => 'required|string',
            'weight' => 'required|numeric',
            'max_weight' => 'required|numeric',
            'status' => 'nullable|string',
            'check_in_at' => 'nullable|date',
        ]);

        // 2. Data Preparation
        $data['status'] = $data['status'] ?? 'Checked-in';
        $data['check_in_at'] = $data['check_in_at'] ?? now();
        // Loaded and unloaded times are left as null unless provided

        // 3. Database Write
        $baggage = Baggages::create($data); // Capture the created model

        // 4. Inertia Success Response
        // Use response()->json and flash the success message and the new ID.
        // The flashed 'id' is required for your client-side state update.
        return redirect()->back()->with([
        'success' => 'Baggage assigned successfully!',
        'id' => $baggage->id,
        ]);
    }

    public function update(Request $request)
    {
        $bag = Baggages::findOrFail($request->id);

        $data = $request->validate([
            'id' => 'required|integer|exists:baggages,id',
            'tag' => 'required|string|unique:baggages,tag,' . $bag->id, // allow updating same tag
            'type' => 'required|string',
            'weight' => 'required|numeric',
            'max_weight' => 'required|numeric',
            'status' => 'nullable|string',
            'check_in_at' => 'nullable|date',
            'loaded_at' => 'nullable|date',
            'unloaded_at' => 'nullable|date',
        ]);

        // Update everything, including check_in_at
        $bag->update([
            'tag' => $data['tag'],
            'type' => $data['type'],
            'weight' => $data['weight'],
            'max_weight' => $data['max_weight'],
            'status' => $data['status'] ?? $bag->status,
            'check_in_at' => $data['check_in_at'] ?? $bag->check_in_at,
            'loaded_at' => $data['loaded_at'] ?? $bag->loaded_at,
            'unloaded_at' => $data['unloaded_at'] ?? $bag->unloaded_at,
        ]);

        return response()->json([
        'success' => 'Baggage updated successfully!',
        'id' => $bag->id,
    ]);
    }
}

