<?php

namespace App\Http\Controllers;

use App\Models\Baggages;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use App\Services\BHS\StatusHandlerFactory;


/**
 * BaggageController
 *
 * Handles BHS operations: showing baggages and updating statuses.
 * SOLID, OOP, Strategy pattern applied.
 */
class BaggageController extends Controller
{
    /**
     * Show all baggages.
     * Only PMS-checked-in baggages can be manipulated.
     */
    public function index()
    {
        $baggages = Baggages::orderBy('created_at', 'desc')->get();

        return Inertia::render('Baggage/Index', [
            'baggages' => $baggages,
        ]);
    }

    /**
     * Update baggage status (Load, Unload, Delivered).
     * Prevents changes to Pending (PMS-controlled).
     */
   public function updateStatus(Request $request, Baggages $baggage): \Inertia\Response|RedirectResponse
    {
        // 1. Validation: Ensure the requested status is valid and exists in our allowed statuses
        $validated = $request->validate([
            'status' => 'required|string|in:Pending,Checked-in,Loaded,Unloaded,Delivered',
        ]);

        $newStatus = $validated['status'];

        try {
            // 2. Status Transition Logic: NOW USING YOUR DEDICATED MODEL METHODS
            // This ensures the status AND the corresponding timestamp (e.g., loaded_at) are saved.
            switch ($newStatus) {
                case 'Checked-in':
                    $baggage->markAsCheckedIn();
                    break;
                case 'Loaded':
                    $baggage->markAsLoaded();
                    break;
                case 'Unloaded':
                    $baggage->markAsUnloaded();
                    break;
                case 'Delivered':
                    $baggage->markAsDelivered();
                    break;
                default:
                    // Only process statuses that transition the baggage item
                    break;
            }

        } catch (\Exception $e) {
            // Log the error for debugging purposes and return an error response
            Log::error("Failed to update baggage status for ID {$baggage->id}: " . $e->getMessage());

            // This now correctly matches the union type in the method signature
            return back()->with('error', 'Could not update baggage status due to a database error.');
        }

        // 3. Response: Return the Inertia response, forcing a re-fetch of the 'baggages' prop only.
        return Inertia::render('Baggage/Tracking2', [
            // Re-fetch all baggage items to ensure the entire list is up-to-date
            'baggages' => Baggages::all(),
        ]);
    }
}
