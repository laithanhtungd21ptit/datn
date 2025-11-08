# Script tạo JWT Secret ngẫu nhiên
# Chạy trong PowerShell: .\generate-jwt-secret.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  JWT Secret Generator" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Tạo random bytes
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
$rng.GetBytes($bytes)

# Convert sang base64
$secret = [Convert]::ToBase64String($bytes)

Write-Host "JWT Secret của bạn:" -ForegroundColor Green
Write-Host $secret -ForegroundColor Yellow
Write-Host ""
Write-Host "Độ dài: $($secret.Length) ký tự" -ForegroundColor Gray
Write-Host ""
Write-Host "Sao chép và dán vào:" -ForegroundColor Cyan
Write-Host "  - Vercel Environment Variables (JWT_SECRET)" -ForegroundColor White
Write-Host "  - File .env trong backend (JWT_SECRET=...)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  LƯU Ý: Giữ bí mật, không commit lên Git!" -ForegroundColor Red
Write-Host ""

# Copy to clipboard (optional)
try {
    Set-Clipboard -Value $secret
    Write-Host "✓ Đã copy vào clipboard!" -ForegroundColor Green
} catch {
    Write-Host "ℹ Không thể copy tự động, hãy copy thủ công" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Nhấn Enter để đóng"
