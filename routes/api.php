<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\Baggages;
use App\Http\Controllers\BaggageController;
use inertia\Inertia;


    //FIS Connecting Flights
    Route::get('/connecting-flights', function () {
        // This assumes the component is located at 'resources/js/Pages/Connecting/Index.tsx'
        return Inertia::render('Connecting/Index');
    })->name('connecting.index');

    // Assign Baggages
    Route::get('/baggages/assign', function () {
        return Inertia::render('Baggage/Form');
    })->name('baggages.assign');
