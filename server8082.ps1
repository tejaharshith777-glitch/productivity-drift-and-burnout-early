$port = 8082
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on port $port..."

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $url = $request.Url.LocalPath
        if ($url -eq "/" -or $url -eq "") { 
            $url = "/index.html" 
        }
        
        $filePath = Join-Path "c:\Users\tejah\OneDrive\Desktop\New folder" $url.Substring(1)
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript" }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # Fallback for SPA Routing / Queries
            $fallbackPath = Join-Path "c:\Users\tejah\OneDrive\Desktop\New folder" "index.html"
            if (Test-Path $fallbackPath) {
                $bytes = [System.IO.File]::ReadAllBytes($fallbackPath)
                $response.ContentType = "text/html"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
            }
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
