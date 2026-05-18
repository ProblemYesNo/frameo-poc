using Microsoft.Extensions.FileProviders;
using frameo_api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:5295", "https://localhost:7276");

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });

    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSingleton<ImageStore>();
builder.Services.AddSingleton<WebSocketHub>();

var app = builder.Build();

app.UseCors("frontend");
app.UseWebSockets();

// Make the uploads directory exist on startup 
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

await app.Services.GetRequiredService<ImageStore>().InitializeAsync();

app.MapGet("/", () => Results.Ok(new { service = "frameo-api", version = "1.0.0", status = "OK" }));
app.MapGet("/api/images", (ImageStore store) => Results.Ok(store.GetAll()));
app.MapPost("/uploads", async (
    HttpRequest request,
    ImageStore store,
    WebSocketHub hub,
    CancellationToken cancellationToken) =>
{
    if(!request.HasFormContentType)
    {
        return Results.BadRequest("Expected multipart/form-data content type.");
    }

    var form = await request.ReadFormAsync(cancellationToken);
    var imageFile = form.Files["image"];
    var title = form["title"].ToString();
    var tagsRaw = form["tags"].FirstOrDefault() ?? string.Empty;

    if(imageFile is null)
    {
        return Results.BadRequest("Missing file field: image.");
    }

    if (string.IsNullOrEmpty(title))
    {
        return Results.BadRequest("Title is required.");
    }

    var tags = tagsRaw
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

    if(tags.Length == 0)
    {
        return Results.BadRequest("At least one tag is required.");
    }
    if(tags.Length > 5)
    {
        return Results.BadRequest("A maximum of 5 tags is allowed.");
    }

    try
    {
        var image = await store.AddAsync(imageFile, title, tags, cancellationToken);
        await hub.BroadcastNewImageAsync(image, cancellationToken);
        return Results.Created($"/api/images/{image.Id}", image);
    }
    catch(InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (Exception)
    {
        return Results.Problem("Unexpected error while saving image upload.");
    }
})
.DisableAntiforgery();

app.Map("ws", async (HttpContext context, WebSocketHub hub) => await hub.AcceptSocketAsync(context));

await app.RunAsync();
