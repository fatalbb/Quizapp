using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizApp.Domain.Entities;

namespace QuizApp.Infrastructure.Persistence.Configurations;

public class AttemptAnswerConfiguration : IEntityTypeConfiguration<AttemptAnswer>
{
    public void Configure(EntityTypeBuilder<AttemptAnswer> builder)
    {
        builder.Property(aa => aa.InputText).HasMaxLength(2000);
        builder.Property(aa => aa.AiEvaluationNotes).HasMaxLength(2000);

        builder.HasOne(aa => aa.QuizAttempt)
            .WithMany(qa => qa.AttemptAnswers)
            .HasForeignKey(aa => aa.QuizAttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(aa => aa.Question)
            .WithMany()
            .HasForeignKey(aa => aa.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(aa => aa.SelectedAnswer)
            .WithMany()
            .HasForeignKey(aa => aa.SelectedAnswerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
