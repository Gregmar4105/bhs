<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Baggages;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use App\Services\BHS\StatusHandlerFactory;

/**
 * Controller to manage Baggage operations and status updates.
 */
class FinalBaggageController extends Controller
{
    /**
     * Handles the POST request to update the status of a specific baggage item.
     * Uses explicit database transaction to ensure atomicity.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Baggages $baggage Uses Route Model Binding.
     * @return \Illuminate\Http\RedirectResponse
     */


    public function index(Request $request): \Inertia\Response
    {
        // Always fetch the latest data for the dashboard
        return Inertia::render('Baggage/Index', [ 
            'baggages' => Baggages::all(), 
        ]);
    }

    public function updateStatus(Request $request, Baggages $baggage): RedirectResponse
    {
        // Validate the incoming status (only allowed values)
        $request->validate([
            // ENUM status list
            'status' => 'required|string|in:Pending,Checked-in,Loaded,Unloaded,Delivered,Lost/Delayed',
        ]);

        // New desired status
        $newStatus = $request->status;

        // Store tag for flash message
        $tag = $baggage->tag;

        // Start a database transaction to ensure integrity
        DB::beginTransaction();

        try {
            // Create the correct handler based on the requested status
            $handler = StatusHandlerFactory::make($newStatus);

            // Execute the handler logic (updates $baggage in memory)
            $handler->handle($baggage);

            // Save the updated baggage status to the database
            $baggage->save();
            
            // Commit the transaction if everything succeeded
            DB::commit();

        } catch (\Exception $e) {
            // Rollback the transaction if the handler threw an exception (e.g., transition failure)
            DB::rollBack();

            // Return a flash error message
            return back()->with('error', $e->getMessage());
        }

        // Redirect back to the tracking page for a full data refresh
        return redirect()->route('baggage.index')
            ->with('success', "Baggage $tag status successfully updated to $newStatus.");
    }
}
