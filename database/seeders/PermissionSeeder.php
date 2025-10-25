<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'role-show',
            'role-create',
            'role-edit',
            'role-delete',
            'user-create',
            'user-edit',
            'user-delete',
            'pms_administrator',
            'fis_administrator',
            'bhs_administrator',
            'atc_administrator',
            'ars_administrator',
            'iaos_administrator',
        ];

        foreach ($permissions as $key => $permission) {
            Permission::create(['name' => $permission]);
        }
    }
}
