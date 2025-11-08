<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon; // Ensure this is imported for the timestamp methods

/**
 * Class Baggage
 * * Represents a piece of checked-in or cabin baggage in the system.
 */
class Baggages extends Model // Changed from Baggages to Baggage (Recommended)
{
    use HasFactory;

    protected $table = "baggages"; // Keeping the table name explicit

    protected $fillable = [
        'tag',
        'type',
        'weight',
        'max_weight',
        'passenger_id',
        'flight_number',
        'destination',
        'status',
    ];

    protected $casts = [
        'weight' => 'float',
        'max_weight' => 'float',
        'checked_in_at' => 'datetime',
        'loaded_at' => 'datetime',
        'unloaded_at' => 'datetime',
    ];

    /* ------------------------------ ✅ ACCESSORS ------------------------------ */

    /**
     * Determine if the baggage is overweight.
     */
    public function getIsOverweightAttribute(): bool
    {
        return $this->weight > $this->max_weight;
    }

    /**
     * Calculate the excess weight in KG.
     */
    public function getExcessWeightAttribute(): float
    {
        return max(0, $this->weight - $this->max_weight);
    }

    /**
     * Calculate the fee for excess weight.
     */
    public function calculateFee(): float
    {
        if (!$this->is_overweight) return 0;
        return $this->excess_weight * 200; // fee per KG
    }
    

    /* --------------------------- ✅ STATUS MUTATORS -------------------------- */

    public function markAsCheckedIn(): void
    {
        $this->update([
            'status' => 'Checked-in',
            'checked_in_at' => Carbon::now()
        ]);
    }

    public function markAsLoaded(): void
    {
        $this->update([
            'status' => 'Loaded',
            'loaded_at' => Carbon::now()
        ]);
    }

    public function markAsUnloaded(): void
    {
        $this->update([
            'status' => 'Unloaded',
            'unloaded_at' => Carbon::now()
        ]);
    }

    public function markAsDelivered(): void
    {
        // Assuming 'Delivered' doesn't require a dedicated timestamp for now
        $this->update([
            'status' => 'Delivered'
        ]);
    }

    public function markAsLostDelayed(): void
    {
        // 
        $this->update([
            'status' => 'Lost/Delayed'
        ]);
    }
}