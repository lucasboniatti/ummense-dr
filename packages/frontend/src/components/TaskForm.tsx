import React from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '@/schemas';
import { FormField, FormInput } from './composite/FormField';
import { Button } from './ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

const taskFormSchema = taskSchema.pick({
  title: true,
  description: true,
  priority: true,
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  onSubmit?: (task: any) => Promise<void> | void;
  onCancel?: () => void;
  initialData?: any;
}

function defaultValuesFromInitialData(initialData?: any): TaskFormValues {
  const rawPriority = initialData?.priority;
  const priority =
    rawPriority === 'low' ? 'P3' : rawPriority === 'medium' ? 'P2' : rawPriority === 'high' ? 'P1' : rawPriority || 'P2';

  return {
    title: initialData?.title || initialData?.name || '',
    description: initialData?.description || '',
    priority,
  };
}

export function TaskForm({ onSubmit, onCancel, initialData }: TaskFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    mode: 'onBlur',
    defaultValues: defaultValuesFromInitialData(initialData),
  });

  const handleFormSubmit = async (data: TaskFormValues) => {
    try {
      await onSubmit?.({
        ...data,
        name: data.title,
      });
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Falha ao salvar a tarefa.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-2xl space-y-6">
      <FormInput
        label="Título da tarefa"
        type="text"
        placeholder="Ex.: Revisar estratégia de onboarding"
        required
        error={errors.title?.message}
        {...register('title')}
      />

      <FormInput
        label="Descrição"
        type="text"
        placeholder="Contexto rápido da tarefa"
        error={errors.description?.message}
        {...register('description')}
      />

      <FormField label="Prioridade" error={errors.priority?.message} required>
        <div>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger state={errors.priority ? 'error' : 'default'}>
                  <SelectValue placeholder="Selecione uma prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 · Alta</SelectItem>
                  <SelectItem value="P2">P2 · Média</SelectItem>
                  <SelectItem value="P3">P3 · Baixa</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </FormField>

      {errors.root && (
        <div className="app-inline-banner app-inline-banner-error" role="alert">
          <strong>Tarefa</strong>
          {errors.root.message}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar tarefa'}
        </Button>
      </div>
    </form>
  );
}
