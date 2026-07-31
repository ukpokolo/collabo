<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    /**
     * List users available for assignment.
     *
     * Only the fields the board needs — never the whole model, which would
     * leak password hashes and remember tokens onto a public endpoint.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            User::orderBy('name')->get(['id', 'name', 'email'])
        );
    }
}
