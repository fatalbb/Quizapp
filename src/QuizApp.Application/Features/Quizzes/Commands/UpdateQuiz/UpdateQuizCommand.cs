using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.UpdateQuiz;

public class UpdateQuizCommand : IRequest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public int PassingScorePercentage { get; set; }
    public List<QuizCategoryDto> Categories { get; set; } = [];
}

public class UpdateQuizCommandHandler : IRequestHandler<UpdateQuizCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizCategories)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        if (quiz.Status != QuizStatus.Draft)
            throw new InvalidOperationException("Can only update quizzes in Draft status.");

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.TimeLimitMinutes = request.TimeLimitMinutes;
        quiz.PassingScorePercentage = request.PassingScorePercentage;

        _context.QuizCategories.RemoveRange(quiz.QuizCategories);
        quiz.QuizCategories = request.Categories.Select(c => new QuizCategory
        {
            QuizId = quiz.Id,
            CategoryId = c.CategoryId,
            QuestionCount = c.QuestionCount,
            EasyPercentage = c.EasyPercentage,
            MediumPercentage = c.MediumPercentage,
            HardPercentage = c.HardPercentage
        }).ToList();

        await _context.SaveChangesAsync(cancellationToken);
    }
}
