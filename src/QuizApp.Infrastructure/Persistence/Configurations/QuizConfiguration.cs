using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizApp.Domain.Entities;

namespace QuizApp.Infrastructure.Persistence.Configurations;

public class QuizConfiguration : IEntityTypeConfiguration<Quiz>
{
    public void Configure(EntityTypeBuilder<Quiz> builder)
    {
        builder.Property(q => q.Title).HasMaxLength(300).IsRequired();
        builder.Property(q => q.Description).HasMaxLength(2000);

        builder.HasOne(q => q.CreatedBy)
            .WithMany(u => u.CreatedQuizzes)
            .HasForeignKey(q => q.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
