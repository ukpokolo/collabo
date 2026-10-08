<?php

namespace App\Domain\Users\Http\Controllers;

use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
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
