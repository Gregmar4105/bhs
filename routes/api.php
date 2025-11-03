<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\Baggages;
use App\Http\Controllers\BaggageController;


Route::get('/baggages', [BaggageController::class, 'apiIndex']);  // JSON for n8n
Route::post('/baggages/update/{id}', [BaggageController::class, 'apiUpdate']);   // Create baggage via n8n


// // Get all baggages
// Route::get('/baggages', function () {
//     return Baggages::orderBy('created_at', 'desc')->get();
// });

// // Insert new baggage (from PMS / n8n webhook)
// Route::post('/baggages', function (Request $request) {
//     return Baggages::create($request->all());
// });

// // Update baggage status (from React dashboard)
// Route::post('/baggages/{id}/status', function (Request $request, $id) {
//     $baggage = Baggages::findOrFail($id);
//     $baggage->status = $request->status;
//     $baggage->save();

//     return response()->json(['message' => 'Status updated successfully']);
// });
