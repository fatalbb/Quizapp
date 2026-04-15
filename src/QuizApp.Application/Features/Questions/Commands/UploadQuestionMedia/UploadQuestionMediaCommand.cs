using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Commands.UploadQuestionMedia;

public class UploadQuestionMediaCommand : IRequest<Guid>
{
    public Guid QuestionId { get; set; }
    public Stream FileStream { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string ContentMimeType { get; set; } = string.Empty;
    public MediaType MediaType { get; set; }
}

public class UploadQuestionMediaCommandHandler : IRequestHandler<UploadQuestionMediaCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public UploadQuestionMediaCommandHandler(IApplicationDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    public async Task<Guid> Handle(UploadQuestionMediaCommand request, CancellationToken cancellationToken)
    {
        var question = await _context.Questions.FindAsync([request.QuestionId], cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        var subFolder = request.MediaType == MediaType.Image ? "images" : "tables";
        var (storedFileName, filePath) = await _fileStorageService.SaveFileAsync(
            request.FileStream, request.FileName, subFolder, cancellationToken);

        var media = new QuestionMedia
        {
            Id = Guid.NewGuid(),
            QuestionId = request.QuestionId,
            FileName = request.FileName,
            StoredFileName = storedFileName,
            ContentMimeType = request.ContentMimeType,
            FilePath = filePath,
            MediaType = request.MediaType
        };

        _context.QuestionMedia.Add(media);
        await _context.SaveChangesAsync(cancellationToken);

        return media.Id;
    }
}
