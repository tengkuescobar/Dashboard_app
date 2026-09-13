<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    private function checkAdmin(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Akses ditolak. Hanya admin yang memiliki izin mengelola user.');
        }
    }

    public function index(Request $request)
    {
        $this->checkAdmin($request);

        $users = User::select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,member',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'created_at' => $user->created_at,
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|required|in:admin,member',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'created_at' => $user->created_at,
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->checkAdmin($request);

        if ($user->id === $request->user()->id) {
            return response()->json(['error' => 'Tidak dapat menghapus akun Anda sendiri.'], 400);
        }

        $user->delete();

        return response()->json(['message' => 'User berhasil dihapus.']);
    }
}
