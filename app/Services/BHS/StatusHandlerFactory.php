<?php

namespace App\Services\BHS;

use App\Models\Baggages;

interface StatusHandlerInterface
{
    public function handle(Baggages $baggage): void;
}

class CheckedInHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        $baggage->status = 'Checked-in';
    }
}

class LoadedHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status !== 'Checked-in') {
            throw new \Exception("Cannot load baggage before check-in");
        }
        $baggage->status = 'Loaded';
    }
}

class UnloadedHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status !== 'Loaded') {
            throw new \Exception("Cannot unload baggage before loading");
        }
        $baggage->status = 'Unloaded';
    }
}

class DeliveredHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status !== 'Unloaded') {
            throw new \Exception("Cannot deliver baggage before unloading");
        }
        $baggage->status = 'Delivered';
    }
}

class LostDelayedHandler implements StatusHandlerInterface {
    public function handle(Baggages $baggage): void {
        // A baggage cannot be marked Lost/Delayed if it has already been Delivered.
        if ($baggage->status === 'Delivered') {
            throw new \Exception("Cannot mark delivered baggage as Lost/Delayed.");
        }
        // This is a status that can be applied at any stage prior to delivery.
        $baggage->status = 'Lost/Delayed';
    }
}


class StatusHandlerFactory
{
    public static function make(string $status): StatusHandlerInterface
    {
        return match ($status) {
            'Checked-in' => new CheckedInHandler(),
            'Loaded' => new LoadedHandler(),
            'Unloaded' => new UnloadedHandler(),
            'Delivered' => new DeliveredHandler(),
            'Lost/Delayed' => new LostDelayedHandler(),
            default => throw new \Exception("Invalid status: $status"),
        };
    }
}
