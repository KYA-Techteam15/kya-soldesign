# Images de l'installateur NSIS aux couleurs KYA (spec 012, FR-E2).
#
# NSIS n'accepte que des BMP 24 bits aux tailles fixes : bandeau latéral des pages d'accueil et de
# fin (164 × 314) et vignette d'en-tête des autres pages (150 × 57). Elles sont dérivées du logo
# `icons/source.png` ; relancer ce script après un changement de logo.
#
#   pwsh tools/release/installer-art.ps1

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\apps\desktop\src-tauri')
$source = [System.Drawing.Image]::FromFile((Join-Path $root 'icons\source.png'))
$target = Join-Path $root 'installer'
New-Item -ItemType Directory -Force -Path $target | Out-Null

$teal = [System.Drawing.Color]::FromArgb(0x1c, 0xa1, 0x8c)
$orange = [System.Drawing.Color]::FromArgb(0xf9, 0x9d, 0x32)
$rule = [System.Drawing.Color]::FromArgb(0xe8, 0xe8, 0xe8)
$muted = [System.Drawing.Color]::FromArgb(0x6b, 0x76, 0x84)

# Le logo occupe le centre de la source, entouré de blanc : on en garde le cadre utile.
$crop = New-Object System.Drawing.Rectangle 160, 170, 704, 680

function New-Canvas([int] $width, [int] $height) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = 'AntiAlias'
  $graphics.InterpolationMode = 'HighQualityBicubic'
  $graphics.TextRenderingHint = 'ClearTypeGridFit'
  $graphics.Clear([System.Drawing.Color]::White)
  return @($bitmap, $graphics)
}

function Draw-Rule($graphics, [int] $y, [int] $width, [int] $height) {
  # Filet de la charte : orange, teal, puis gris clair — le même que l'en-tête des documents.
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $orange), 0, $y, [int]($width * 0.34), $height)
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $teal), [int]($width * 0.34), $y, [int]($width * 0.12), $height)
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $rule), [int]($width * 0.46), $y, $width - [int]($width * 0.46), $height)
}

# Bandeau latéral : logo en haut, filet, éditeur en pied.
$sidebar, $graphics = New-Canvas 164 314
$graphics.DrawImage($source, (New-Object System.Drawing.Rectangle 17, 36, 130, 126), $crop, 'Pixel')
Draw-Rule $graphics 186 164 4
$font = New-Object System.Drawing.Font 'Segoe UI', 7.5
$format = New-Object System.Drawing.StringFormat
$format.Alignment = 'Center'
$graphics.DrawString('KYA-Energy Group', $font, (New-Object System.Drawing.SolidBrush $muted), (New-Object System.Drawing.RectangleF 0, 286, 164, 18), $format)
$graphics.Dispose()
$sidebar.Save((Join-Path $target 'sidebar.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
$sidebar.Dispose()

# Vignette d'en-tête : logo seul, sur blanc.
$header, $graphics = New-Canvas 150 57
$graphics.DrawImage($source, (New-Object System.Drawing.Rectangle 92, 4, 51, 49), $crop, 'Pixel')
$graphics.Dispose()
$header.Save((Join-Path $target 'header.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
$header.Dispose()

$source.Dispose()
Write-Output "installer art written to $target"
