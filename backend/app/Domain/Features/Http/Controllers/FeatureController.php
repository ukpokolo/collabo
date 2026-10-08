<?php

namespace App\Domain\Features\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Pennant\Feature;

class FeatureController extends Controller
{
    /** Every defined flag, resolved for the signed-in user: { "list-view": false, ... }. */
    public function index(Request $request): JsonResponse
    {
        return response()->json(Feature::for($request->user())->all());
    }
}
