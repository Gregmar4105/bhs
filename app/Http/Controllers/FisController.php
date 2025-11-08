<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/**
 * Controller to mock data retrieval from the external Flight Information System (FIS).
 */
class FisController extends Controller
{
    /**
     * Returns a JSON payload of connecting flights and their current states.
     * In a real application, this would call an external FIS API or database view.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    // public function getConnectingFlights(): JsonResponse
    // {
    //     $mockFisData = [
    //         [
    //             'flight_number' => '1458',
    //             'airline' => 'NRT',
    //             'transfer_time' => '10:00pm',
    //             'state' => 'In Transit',
    //         ],
    //         [
    //             'flight_number' => '125',
    //             'airline' => 'SEOUL',
    //             'transfer_time' => '10:00am',
    //             'state' => 'Held/Delayed',
    //         ],
    //         [
    //             'flight_number' => '658',
    //             'airline' => 'BKK',
    //             'transfer_time' => '1:10pm',
    //             'state' => 'Misrouted',
    //         ],
    //         [
    //             'flight_number' => '203',
    //             'airline' => 'LAX',
    //             'transfer_time' => '1:45pm',
    //             'state' => 'In Transit',
    //         ],
    //     ];

    //     return response()->json([
    //         'flights' => $mockFisData,
    //         'last_updated' => now()->toDateTimeString(),
    //     ]);
    // }
}