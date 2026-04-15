using Microsoft.Extensions.Configuration;
using QuizApp.Application.Common.Interfaces;

namespace QuizApp.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public FileStorageService(IConfiguration configuration)
    {
        var configPath = configuration["FileStorage:BasePath"] ?? "wwwroot/uploads";
        _basePath = Path.IsPathRooted(configPath)
            ? configPath
            : Path.Combine(Directory.GetCurrentDirectory(), configPath);
    }

    public async Task<(string storedFileName, string filePath)> SaveFileAsync(Stream fileStream, string fileName, string subFolder, CancellationToken cancellationToken = default)
    {
        var storedFileName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var year = DateTime.UtcNow.Year.ToString();
        var month = DateTime.UtcNow.Month.ToString("D2");
        var directory = Path.Combine(_basePath, subFolder, year, month);

        Directory.CreateDirectory(directory);

        var fullPath = Path.Combine(directory, storedFileName);
        using var stream = new FileStream(fullPath, FileMode.Create);
        await fileStream.CopyToAsync(stream, cancellationToken);

        var relativePath = Path.Combine(subFolder, year, month, storedFileName).Replace("\\", "/");
        return (storedFileName, relativePath);
    }

    public Task DeleteFileAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_basePath, filePath);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetFileUrl(string filePath) => $"/api/files/{filePath}";
}
