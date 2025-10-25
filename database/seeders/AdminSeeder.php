<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create the Administrator role if it doesn't exist
        $adminRole = Role::firstOrCreate(['name' => 'PMS_Administrator']);

        // Get all the permissions from the PermissionSeeder
        $permissions = Permission::pluck('name')->toArray();

        // Assign all permissions to the Administrator role
        $adminRole->givePermissionTo($permissions);

        // Create the admin user if it doesn't exist
        $adminUser = User::firstOrCreate(
            ['email' => 'gregmarresurreccion4105@gmail.com'],
            [
                'name' => 'Admin',
                'password' => bcrypt('Admin@PMS'), 
            ]
        );

        // Assign the Administrator role to the admin user
        $adminUser->assignRole('PMS_Administrator');
    }
}
