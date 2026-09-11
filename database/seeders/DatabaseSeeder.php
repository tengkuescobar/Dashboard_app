<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@united.test',
            'role' => 'admin',
        ]);

        User::factory()->create([
            'name' => 'Editor User',
            'email' => 'editor@united.test',
            'role' => 'editor',
        ]);

        User::factory()->create([
            'name' => 'Viewer User',
            'email' => 'viewer@united.test',
            'role' => 'viewer',
        ]);
    }
}
