$buildId = "a49901ac-a8a8-4a74-a8bb-4187f89be19e"
$checkInterval = 60  # Verificar cada 60 segundos

Write-Host "=== Monitoreando build del APK ===" -ForegroundColor Cyan
Write-Host "Build ID: $buildId" -ForegroundColor Gray
Write-Host "Verificando cada $checkInterval segundos..." -ForegroundColor Gray
Write-Host ""

while ($true) {
    $result = npx eas-cli build:view $buildId --json 2>&1 | ConvertFrom-Json
    
    $status = $result.status
    $currentTime = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$currentTime] Estado: $status" -ForegroundColor Yellow
    
    if ($status -eq "FINISHED") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ¡BUILD COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "El APK está listo para descargar." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para descargar el APK, ejecuta:" -ForegroundColor White
        Write-Host "  npx eas-cli build:download $buildId" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "O visita el enlace de logs para descargarlo:" -ForegroundColor White
        Write-Host "  https://expo.dev/accounts/itsbenja/projects/feria/builds/$buildId" -ForegroundColor Cyan
        Write-Host ""
        break
    }
    elseif ($status -eq "ERROR" -or $status -eq "CANCELED") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  BUILD FALLIDO O CANCELADO" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Revisa los logs en:" -ForegroundColor Yellow
        Write-Host "  https://expo.dev/accounts/itsbenja/projects/feria/builds/$buildId" -ForegroundColor Cyan
        Write-Host ""
        break
    }
    elseif ($status -eq "IN_PROGRESS") {
        Write-Host "  Build en progreso..." -ForegroundColor Green
    }
    elseif ($status -eq "IN_QUEUE") {
        if ($result.queuePosition) {
            Write-Host "  Posición en cola: $($result.queuePosition)" -ForegroundColor Gray
            if ($result.estimatedWaitTimeLeftSeconds) {
                $waitMinutes = [math]::Round($result.estimatedWaitTimeLeftSeconds / 60)
                Write-Host "  Tiempo estimado: ~$waitMinutes minutos" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds $checkInterval
}

