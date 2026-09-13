<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Page;

class PageController extends Controller
{
    public function index(Request $request)
    {
        $pages = Page::orderBy('order')->get();
        return response()->json($pages);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $maxOrder = Page::max('order') ?? -1;
        $page = Page::create([
            'name' => $validated['name'],
            'order' => $maxOrder + 1,
            'charts' => []
        ]);

        return response()->json($page, 201);
    }

    public function update(Request $request, Page $page)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'charts' => 'sometimes|array'
        ]);

        $page->update($validated);

        return response()->json($page);
    }

    public function destroy(Page $page)
    {
        $page->delete();
        return response()->json(['message' => 'Page deleted']);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'pages' => 'required|array',
            'pages.*.id' => 'required|exists:pages,id',
            'pages.*.order' => 'required|integer'
        ]);

        foreach ($validated['pages'] as $pageData) {
            Page::where('id', $pageData['id'])->update(['order' => $pageData['order']]);
        }

        return response()->json(['message' => 'Pages reordered successfully']);
    }
}
