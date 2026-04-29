using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.RunQuery;

public class RunQueryCommand : IRequest<SqlSandboxResult>
{
    public Guid AttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public string Query { get; set; } = string.Empty;
}

public class RunQueryCommandHandler : IRequestHandler<RunQueryCommand, SqlSandboxResult>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISqlSandboxService _sandbox;
    private readonly IFileStorageService _fileStorage;

    public RunQueryCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ISqlSandboxService sandbox,
        IFileStorageService fileStorage)
    {
        _context = context;
        _currentUserService = currentUserService;
        _sandbox = sandbox;
        _fileStorage = fileStorage;
    }

    public async Task<SqlSandboxResult> Handle(RunQueryCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return new SqlSandboxResult { Success = false, ErrorMessage = "Query is empty." };

        // Load attempt + quiz
        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        // Authorization: must be the student taking the attempt
        if (attempt.StudentId != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        // Only allowed in Learning mode
        if (attempt.Quiz.Mode != QuizMode.Learning)
            return new SqlSandboxResult { Success = false, ErrorMessage = "Running queries is only available in Learning quizzes." };

        // Find the question's Excel media
        var question = await _context.Questions
            .IgnoreQueryFilters()
            .Include(q => q.Media)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        var excelMedia = question.Media.FirstOrDefault(m => m.MediaType == MediaType.ExcelTable);
        if (excelMedia == null)
            return new SqlSandboxResult { Success = false, ErrorMessage = "This question has no database tables to query." };

        // Get the Excel file path on disk
        var basePath = ResolveBasePath();
        var fullPath = Path.GetFullPath(Path.Combine(basePath, excelMedia.FilePath));
        if (!File.Exists(fullPath))
            return new SqlSandboxResult { Success = false, ErrorMessage = "Excel file not found on server." };

        await using var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
        return await _sandbox.ExecuteQueryAsync(stream, request.Query, cancellationToken);
    }

    private string ResolveBasePath()
    {
        // Mirror FileStorageService logic
        var configPath = "wwwroot/uploads"; // default
        // We rely on the FileStorageService's GetFileUrl convention; m.FilePath is already relative.
        return Path.IsPathRooted(configPath)
            ? configPath
            : Path.Combine(Directory.GetCurrentDirectory(), configPath);
    }
}
