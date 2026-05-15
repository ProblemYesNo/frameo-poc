namespace frameo_api.Models;

    public sealed record ImageItem(
        Guid Id,
        string Title,
        string [] Tags,
        string Url,
        DateTimeOffset CreatedAt,
        DateTimeOffset ModifiedAt
    );