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
        $baggage->markAsCheckedIn();
    }
}

class LoadedHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status !== 'Checked-in') {
            throw new \Exception("Cannot load baggage before check-in");
        }
        $baggage->markAsLoaded();
    }
}

class UnloadedHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status !== 'Loaded') {
            throw new \Exception("Cannot unload baggage before loading");
        }
        $baggage->markAsUnloaded();
    }
}

class DeliveredHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status !== 'Unloaded') {
            throw new \Exception("Cannot deliver baggage before unloading");
        }
        $baggage->markAsDelivered();
    }
}

class LostDelayedHandler implements StatusHandlerInterface
{
    public function handle(Baggages $baggage): void
    {
        if ($baggage->status === 'Delivered') {
            throw new \Exception("Cannot mark delivered baggage as Lost/Delayed.");
        }

        $baggage->markAsLostDelayed();
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
