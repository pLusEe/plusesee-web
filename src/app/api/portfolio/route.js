import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'portfolio.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(fileContents));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    const items = JSON.parse(fileContents);

    if (body.action === 'delete') {
      const updated = items.filter(item => item.id !== body.id);
      await writeFile(dataFilePath, JSON.stringify(updated, null, 2));
      return NextResponse.json({ success: true });
    }

    // Create new item
    const newItem = {
      id: Date.now(),
      title: body.title || 'Untitled',
      description: body.description || '',
      prompt: body.prompt || '',
      imageUrl: body.imageUrl || '/placeholder.jpg',
      category: body.category || 'Personal',
    };

    items.push(newItem);
    await writeFile(dataFilePath, JSON.stringify(items, null, 2));
    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
