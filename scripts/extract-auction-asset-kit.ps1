param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$outputRoot = Join-Path $PSScriptRoot '..\public\assets\auction'

function Ensure-Parent([string]$Path) {
  $parent = Split-Path -Parent $Path
  [System.IO.Directory]::CreateDirectory($parent) | Out-Null
}

function Export-Crop(
  [string]$Source,
  [string]$Destination,
  [int]$X,
  [int]$Y,
  [int]$Width,
  [int]$Height
) {
  Ensure-Parent $Destination
  $image = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $rect = [System.Drawing.Rectangle]::new($X, $Y, $Width, $Height)
    $crop = $image.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $crop.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $crop.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

function Export-Jpeg([string]$Source, [string]$Destination, [long]$Quality = 84) {
  Ensure-Parent $Destination
  $image = [System.Drawing.Image]::FromFile($Source)
  try {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object MimeType -eq 'image/jpeg'
    $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
      [System.Drawing.Imaging.Encoder]::Quality,
      $Quality
    )
    try {
      $image.Save($Destination, $codec, $parameters)
    } finally {
      $parameters.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

$darkBackground = Join-Path $sourceRoot '01-Dark\01-Backgrounds\dark-auction-bg-main-01.png.png'
$darkPanels = Join-Path $sourceRoot '01-Dark\02-Hero-Header\dark-hero-panels-cards-sheet-01.png.png'
$darkControls = Join-Path $sourceRoot '01-Dark\04-Bid-Controls\dark-controls-filters-forms-sheet-01.png.png'
$darkStatus = Join-Path $sourceRoot '01-Dark\05-Status-Badges\dark-status-timers-icons-decorations-sheet-01.png.png'
$lightBackground = Join-Path $sourceRoot '02-Light\01-Backgrounds\light-auction-bg-main-01.png.png'
$lightPanels = Join-Path $sourceRoot '02-Light\02-Hero-Header\light-hero-panels-cards-sheet-01.png.png'
$lightControls = Join-Path $sourceRoot '02-Light\04-Bid-Controls\light-controls-filters-forms-sheet-01.png.png'
$lightStatus = Join-Path $sourceRoot '02-Light\05-Status-Badges\light-status-timers-icons-decorations-sheet-01.png.png'
$sharedIcons = Join-Path $sourceRoot '03-Shared\Functional-Icons\auction-shared-functional-icons-sheet-01.png.png'

Export-Jpeg $darkBackground (Join-Path $outputRoot 'dark\backgrounds\auction-hall.jpg')
Export-Jpeg $lightBackground (Join-Path $outputRoot 'light\backgrounds\auction-gallery.jpg')

# Panel sheets: compact hero, reusable card frame and section divider.
Export-Crop $darkPanels (Join-Path $outputRoot 'dark\headers\hero-wide.png') 8 6 770 225
Export-Crop $darkPanels (Join-Path $outputRoot 'dark\cards\auction-card-frame.png') 14 255 330 270
Export-Crop $darkPanels (Join-Path $outputRoot 'dark\decorations\section-divider.png') 14 835 435 90
Export-Crop $lightPanels (Join-Path $outputRoot 'light\headers\hero-wide.png') 8 4 706 245
Export-Crop $lightPanels (Join-Path $outputRoot 'light\cards\auction-card-frame.png') 14 267 320 285
Export-Crop $lightPanels (Join-Path $outputRoot 'light\decorations\section-divider.png') 12 842 470 82

# Controls/form sheets: search shell, generic field, operational panel and CTA frame.
Export-Crop $darkControls (Join-Path $outputRoot 'dark\filters\search-frame.png') 18 18 650 125
Export-Crop $darkControls (Join-Path $outputRoot 'dark\filters\field-frame.png') 25 183 380 100
Export-Crop $darkControls (Join-Path $outputRoot 'dark\controls\operation-panel.png') 18 615 355 275
Export-Crop $darkControls (Join-Path $outputRoot 'dark\controls\button-frame.png') 20 920 365 128
Export-Crop $lightControls (Join-Path $outputRoot 'light\filters\search-frame.png') 16 14 625 118
Export-Crop $lightControls (Join-Path $outputRoot 'light\filters\field-frame.png') 18 155 360 105
Export-Crop $lightControls (Join-Path $outputRoot 'light\controls\operation-panel.png') 14 715 355 225
Export-Crop $lightControls (Join-Path $outputRoot 'light\controls\button-frame.png') 16 958 370 105

# Existing UI states only: success, warning, danger and timer.
Export-Crop $darkStatus (Join-Path $outputRoot 'dark\badges\success-frame.png') 12 6 344 142
Export-Crop $darkStatus (Join-Path $outputRoot 'dark\badges\warning-frame.png') 365 6 344 142
Export-Crop $darkStatus (Join-Path $outputRoot 'dark\badges\danger-frame.png') 718 6 344 142
Export-Crop $darkStatus (Join-Path $outputRoot 'dark\timers\timer-frame.png') 10 442 355 122
Export-Crop $lightStatus (Join-Path $outputRoot 'light\badges\success-frame.png') 10 4 350 145
Export-Crop $lightStatus (Join-Path $outputRoot 'light\badges\warning-frame.png') 360 4 350 145
Export-Crop $lightStatus (Join-Path $outputRoot 'light\badges\danger-frame.png') 710 4 350 145
Export-Crop $lightStatus (Join-Path $outputRoot 'light\timers\timer-frame.png') 8 425 360 125

# Shared functional icons used by real components. Their accessible names remain in HTML.
Export-Crop $sharedIcons (Join-Path $outputRoot 'shared\icons\timer.png') 1090 20 160 175
Export-Crop $sharedIcons (Join-Path $outputRoot 'shared\icons\credits.png') 25 225 170 175

Get-ChildItem -LiteralPath $outputRoot -Recurse -File |
  Sort-Object FullName |
  Select-Object FullName, Length
