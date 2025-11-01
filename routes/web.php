<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');


Route::middleware(['auth', 'verified', 'prevent-back'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard')/*->middleware('permission:bhs_administrator/bhs_employee')*/;   
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
