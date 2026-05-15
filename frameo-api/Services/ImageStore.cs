using System.Text.Json;
using frameo_api.Models;

namespace frameo_api.Services;


    public sealed class ImageStore
    {
        private readonly ILogger<ImageStore> _logger;
        private readonly string _uploadsDir;
        private readonly string _metadataDir;
        private readonly string _metadataFile;
        private readonly List<ImageItem> _images = [];
        private readonly SemaphoreSlim _gate = new(1, 1);
        
        private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = true
        };

        public ImageStore(ILogger<ImageStore> logger, IWebHostEnvironment environment)
        {
            _logger = logger;
            _uploadsDir = Path.Combine(environment.ContentRootPath, "uploads");
            _metadataDir = Path.Combine(environment.ContentRootPath, "App_Data");
            _metadataFile = Path.Combine(_metadataDir, "images.json");
        }

        public async Task InitializeAsync(CancellationToken cancellationToken = default)
        {
            Directory.CreateDirectory(_uploadsDir);
            Directory.CreateDirectory(_metadataDir);

            if(File.Exists(_metadataFile))
            {
                await using var stream = File.OpenRead(_metadataFile);
                var loaded = await JsonSerializer.DeserializeAsync<List<ImageItem>>(stream, _jsonOptions, cancellationToken);
                if(loaded is { Count: > 0 })
                {
                    _images.AddRange(loaded.OrderByDescending(i => i.CreatedAt));
                }
            }

            if(_images.Count == 0)
            {
                await CreateSeedImagesAsync(cancellationToken);
                await PersistAsync(cancellationToken);
            }
        }

        public IReadOnlyList<ImageItem> GetAll()
        {
            return _images.OrderByDescending(i => i.CreatedAt).ToList();
        }

        public async Task<ImageItem> AddAsync(IFormFile file, string title, IReadOnlyCollection<string> tags, CancellationToken cancellationToken = default)
        {
            if(file.Length <= 0)
            {
                throw new ArgumentException("Uploaded file is empty.", nameof(file));
            }

            if(!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Only image files are allowed.", nameof(file));
            }

            var extension = Path.GetExtension(file.FileName);
            if(string.IsNullOrWhiteSpace(extension))
            {
                extension = ".bin";
            }

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(_uploadsDir, fileName);

            await using (var stream = File.Create(filePath))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            var image = new ImageItem(
                Guid.NewGuid(),
                title,
                tags.ToArray(),
                $"/uploads/{fileName}",
                DateTimeOffset.UtcNow,
                DateTimeOffset.UtcNow
            );

            await _gate.WaitAsync(cancellationToken);
            try
            {
                _images.Insert(0, image);
                await PersistAsync(cancellationToken);
            }
            finally
            {
                _gate.Release();
            }

            _logger.LogInformation("Added new image: {Id} - {Title}", image.Id, image.Title);
            return image;
        }

        private async Task PersistAsync(CancellationToken cancellationToken = default)
        {
            await using var stream = File.Create(_metadataFile);
            await JsonSerializer.SerializeAsync(stream, _images, _jsonOptions, cancellationToken);
        }

        private async Task CreateSeedImagesAsync(CancellationToken cancellationToken = default)
        {
            var seedImages = new[]
            {
                new { Url = "https://placekitten.com/800/600", Title = "Cute Kitten 1", Tags = new[] { "cat", "cute", "kitten" } },
                new { Url = "https://placekitten.com/801/600", Title = "Cute Kitten 2", Tags = new[] { "cat", "cute", "kitten" } },
                new { Url = "https://placekitten.com/800/601", Title = "Cute Kitten 3", Tags = new[] { "cat", "cute", "kitten" } }
            };

            foreach (var seed in seedImages)
            {
                var imageItem = new ImageItem(
                    Guid.NewGuid(),
                    seed.Title,
                    seed.Tags,
                    seed.Url,
                    DateTimeOffset.UtcNow,
                    DateTimeOffset.UtcNow
                );
                _images.Add(imageItem);
            }

            _logger.LogInformation("Created {Count} seed images.", seedImages.Length);
        }
    }
