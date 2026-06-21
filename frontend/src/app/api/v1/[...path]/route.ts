import { NextRequest, NextResponse } from "next/server";

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const pathStr = path.join("/");
  
  // Reconstruct query parameters
  const { search } = new URL(request.url);
  const targetUrl = `${backendUrl}/api/v1/${pathStr}${search}`;

  const headers = new Headers(request.headers);
  
  // Remove host header to avoid SSL handshake/host mismatch on Cloud Run
  headers.delete("host");

  try {
    const method = request.method;
    const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    let body: ArrayBuffer | undefined = undefined;

    if (hasBody) {
      try {
        body = await request.arrayBuffer();
      } catch {
        // Request might not have a body despite the method
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseHeaders = new Headers(response.headers);
    // Remove content-encoding to let Next.js handle server response compression/decompression
    responseHeaders.delete("content-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error for:", targetUrl, error);
    return NextResponse.json(
      { detail: "Proxy connection failed." },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}
