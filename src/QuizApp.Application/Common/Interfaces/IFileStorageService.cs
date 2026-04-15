namespace QuizApp.Application.Common.Interfaces;

public interface IFileStorageService
{
    Task<(string storedFileName, string filePath)> SaveFileAsync(Stream fileStream, string fileName, string subFolder, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string filePath, CancellationToken cancellationToken = default);
    string GetFileUrl(string filePath);
}
