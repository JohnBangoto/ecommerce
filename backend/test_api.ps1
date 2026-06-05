$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWZxcGJmcGh6cHV5ZHB4Z25jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3MDc0NiwiZXhwIjoyMDk1NjQ2NzQ2fQ.hDlUKcOXEcbRgQbuBOgIUVw6hOLdOopIZWDHnNC2TDY"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

Write-Host "Testing Supabase REST API..."
try {
    $r = Invoke-WebRequest -Uri "https://mpifqpbfphzpuydpxgnc.supabase.co/rest/v1/" -Headers $headers -UseBasicParsing
    Write-Host "HTTP Status: $($r.StatusCode) — Project is ACTIVE"
    Write-Host $r.Content
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "HTTP Status: $statusCode"
    Write-Host "Error: $($_.Exception.Message)"
    if ($statusCode -eq 503) {
        Write-Host "=> Le projet Supabase est EN PAUSE (503 Service Unavailable)"
    } elseif ($statusCode -eq 200) {
        Write-Host "=> Projet actif"
    }
}
