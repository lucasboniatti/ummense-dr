import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type WebhookFormData, webhookSchema } from '@/schemas';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';
import { CheckboxField } from './ui/Checkbox';

interface WebhookFormProps {
  onSubmit: (webhook: WebhookFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: WebhookFormData;
}

export function WebhookForm({ onSubmit, onCancel, initialData }: WebhookFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    mode: 'onBlur',
    defaultValues: initialData || { url: '', description: '', enabled: true },
  });

  const handleFormSubmit = async (data: WebhookFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Falha ao salvar o webhook.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {errors.root && (
        <div className="app-inline-banner app-inline-banner-error" role="alert">
          <strong>Webhook</strong>
          {errors.root.message}
        </div>
      )}

      <FormInput
        label="URL do webhook"
        type="url"
        placeholder="https://api.empresa.com/webhooks"
        required
        error={errors.url?.message}
        {...register('url')}
      />

      <FormInput
        label="Descrição"
        type="text"
        placeholder="Para que serve este webhook?"
        error={errors.description?.message}
        {...register('description')}
      />

      <Controller
        name="enabled"
        control={control}
        render={({ field }) => (
          <CheckboxField
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            label="Webhook ativo"
            hint="Mantém o endpoint habilitado para novos disparos."
            error={errors.enabled?.message}
          />
        )}
      />

      <div className="flex justify-end gap-3 border-t border-[color:var(--border-subtle)] pt-4">
        <Button variant="ghost" onClick={onCancel} type="button" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
