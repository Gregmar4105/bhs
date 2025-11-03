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

 


require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
