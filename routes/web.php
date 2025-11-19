<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Baggages;
use App\Http\Controllers\BaggageController;
use App\Http\Controllers\FinalBaggageController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');


Route::middleware(['auth', 'verified', 'prevent-back'])->group(function () {

    // 🧭 DASHBOARD — remains unchanged
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Existing Inertia route for the main dashboard view (now just '/' if tracking is the main page)
    // Renamed to 'index' to follow Inertia/Laravel conventions for listing/dashboard pages.
    Route::get('/baggages', [FinalBaggageController::class, 'index'])->name('baggage.index');

    // 💡 Cleaned RESTful POST route for status update
    // We use a POST to an ID and name the route 'update' for clarity.
    Route::post('/baggages/{baggage}', [FinalBaggageController::class, 'updateStatus'])
        ->name('baggage.update'); 
    });

    // ASSIGN BAGGAGE FORM 
    // Assign / View Baggage Page
        Route::get('/assign-baggages', function () {
            return Inertia::render('Baggage/Assign');
        })->name('baggages.create');

        // API: Get all assigned passenger IDs
        Route::get('/baggage/all-passenger-ids', function () {
            return Baggages::pluck('passenger_id');
        });

        // API: Get baggage by passenger (latest)
        Route::get('/baggage/by-passenger/{id}', function ($id) {
            return Baggages::where('passenger_id', $id)->latest()->firstOrFail();
        });

        // Assign new baggage
        Route::post('/baggage/store', [BaggageController::class, 'store'])->name('baggage.store');

        // Update existing baggage
        Route::post('/baggage/update', [BaggageController::class, 'update'])->name('baggage.update');


    Route::get('/connecting-flights', function () {
        return Inertia::render('Connecting/Index'); 
    })->name('connecting.index');
 

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
